import { tick, untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { isThenable } from '../../core/promise';
import { adoptSnapshotAsDefaults, CHANGE_WORDS, diffForm, snapshotForm, undescribedChanges, type ChangeWords, type ControlSnapshot } from './diff';
import { isDev } from './env';
import { firstInvalidControl, focusLost, restoreFocus } from './focus';
import { readResult } from './undo';
import type { SettingStatus, SettingsChange, SettingsConflict, SettingsFieldDescriptor, SettingsHandler, SettingsResult } from './types';

export { readDefaults, readCurrent, diffForm, describeChanges, adoptCurrentAsDefaults, sameValue, undescribedChanges, CHANGE_WORDS } from './diff';
export type { ChangeWords, ControlLike, FormLike, OptionLike, FieldReading } from './diff';

/** What a staged submit handler gets beside the values. */
export interface SettingsSubmitContext {
	/** What changed, as shown to the person. */
	changes: SettingsChange[];
	/** The revision the draft was based on; save with optimistic concurrency against it. */
	revision?: string | number;
	data: FormData;
	event: SubmitEvent;
}

/** Posted values: one entry per name, a list when a name posted several. */
export type SettingsValues = Record<string, FormDataEntryValue | FormDataEntryValue[]>;

/** The staged submit handler (`onSubmit`). Return `{}`, `{errors}`, `{error}` or `{conflict}`. */
export type SettingsSubmitHandler = SettingsHandler<[SettingsValues, SettingsSubmitContext]>;

/** What `SettingsDraft` reads from SettingsForm, each lazily so props stay live. */
export interface SettingsDraftOptions {
	/** Field descriptors passed to the form; rows add theirs with `register()`. */
	fields: () => readonly SettingsFieldDescriptor[] | undefined;
	/** A controlled change list (apps that keep cross-section drafts). Undefined: diff the DOM. */
	changes: () => SettingsChange[] | undefined;
	revision: () => string | number | undefined;
	/** The `onSubmit` prop. Without one the form posts natively. */
	submit: () => SettingsSubmitHandler | undefined;
	/** A result from a native post round trip or a server form action. A handler's own result wins until the next submit. */
	result: () => SettingsResult | undefined;
	/** The `pending` prop (SvelteKit `enhance`); wins over the handler's own pending state. */
	pending: () => boolean | undefined;
	onDirtyChange: () => ((changes: SettingsChange[]) => void) | undefined;
	/** Shown when the handler throws or rejects. */
	genericError: () => string;
	/** Whether the leave guard is on (default true). */
	guardLeave?: () => boolean | undefined;
	/** On/off words for lone checkboxes in change text. */
	words?: () => ChangeWords | undefined;
}

function hasFailure(result: void | SettingsResult | undefined): boolean {
	return !readResult(result).ok;
}

/** The form's own named fields, in page order: where focus goes when nothing better is left. */
function firstFields(form: HTMLFormElement): HTMLElement[] {
	return Array.from(form.elements).filter(
		(el): el is HTMLElement => el instanceof HTMLElement && el.matches('input:not([type="hidden"]), select, textarea') && Boolean((el as HTMLInputElement).name)
	);
}

function valuesOf(data: FormData): SettingsValues {
	const values: SettingsValues = {};
	for (const name of new Set(data.keys())) {
		const all = data.getAll(name);
		values[name] = all.length === 1 ? all[0] : all;
	}
	return values;
}

/**
 * The staged model, the only one: one per SettingsForm, published through `setSettingsDraft`.
 *
 * - Dirty state is `diffForm` of the real `<form>` against its native defaults (so edits made
 *   before hydration count), or the controlled `changes` list.
 * - `onsubmit` cancels the native post only when there is a handler; while pending, submits are
 *   ignored (and stopped before later listeners, for SvelteKit `enhance`).
 * - A handler result shows until the next submit: field errors (hidden once that field is edited),
 *   a form error, or a conflict (the draft is kept). Success makes the submitted values the new
 *   defaults, so Discard restores what was saved and an edit made while the save was in flight
 *   stays unsaved.
 * - Only the form's own controls count: an input or change from a control of another form (a
 *   nested dialog's own form) is not an edit.
 * - After a failed submit, focus goes to the first invalid control (`firstInvalidControl`: a
 *   group marked invalid gives its checked choice) or `[data-form-error]`, but only while it is
 *   still where the submit left it (or lost): someone typing elsewhere meanwhile keeps their
 *   place, and the alert is announced. After a successful one that took the focused control
 *   away (a conflict review), focus goes to the last edited control, else the first field.
 * - A lock that switches controls off (or on) re-reads the change list: a disabled control
 *   neither posts nor counts as unsaved.
 * - A held navigation whose changes are all saved meanwhile (the save in flight landed) goes
 *   ahead: there is nothing left to lose.
 * - `onDirtyChange` hears every change of the change list, and `[]` when the form unmounts (its
 *   draft is gone), so navigation dots and attention items never outlive the form.
 * - `guard` holds a navigation while dirty: the app calls `guard.request(proceed)` from its
 *   router (SvelteKit `beforeNavigate`), SettingsForm asks, then calls `guard.decide(...)`.
 *
 * Construct it while SettingsForm initialises; attach `draft.attach` to the `<form>` and bind
 * `onsubmit={draft.onsubmit}`; add `<svelte:window onbeforeunload={draft.guard.beforeunload} />`.
 */
export class SettingsDraft {
	#options: SettingsDraftOptions;
	#form: HTMLFormElement | null = null;
	/** Bumped by every edit, reset and attach, so the DOM diff re-reads. */
	#version = $state(0);
	#registered = $state.raw<SettingsFieldDescriptor[]>([]);
	#running = $state(false);
	/** The handler's last result; undefined until a handler runs, then it wins over the prop. */
	#result = $state.raw<SettingsResult | undefined>(undefined);
	#handled = $state(false);
	#saved = $state(false);
	#edited = $state.raw<ReadonlySet<string>>(new Set());
	#generation = 0;
	#lastEdited: HTMLElement | null = null;
	#inflight: Promise<boolean> | null = null;
	#proceed = $state.raw<(() => void) | null>(null);
	#leaving = false;
	#leaveFailed = $state(false);

	constructor(options: SettingsDraftOptions) {
		this.#options = options;
		$effect(() => {
			const changes = this.changes;
			untrack(() => this.#options.onDirtyChange()?.(changes));
		});
		// Unmounting drops the draft: tell the app nothing is unsaved any more. A controlled list
		// is the app's own state, so it keeps it.
		$effect(() => () => {
			untrack(() => {
				if (!this.#options.changes()) this.#options.onDirtyChange()?.([]);
			});
		});
		// The save in flight landed while the leave dialog was open: nothing is left to lose, so go.
		$effect(() => {
			if (!this.#proceed || this.dirtyCount > 0) return;
			untrack(() => {
				const proceed = this.#proceed;
				if (!proceed) return;
				this.#proceed = null;
				this.#leaving = true;
				proceed();
			});
		});
		if (isDev()) {
			const warned = new Set<string>();
			$effect(() => {
				void this.#version;
				const form = this.#form;
				if (!form || this.#options.changes()) return;
				for (const name of undescribedChanges(form, this.fields)) {
					if (warned.has(name)) continue;
					warned.add(name);
					console.warn(`SettingsForm: "${name}" changed but no field describes it, so it does not count as unsaved. Pass it in \`fields\` or register it (a SettingsRow with \`name\`).`);
				}
			});
		}
	}

	/** Every staged field: the form's descriptors, then the rows' registered ones (first name wins). */
	get fields(): SettingsFieldDescriptor[] {
		const seen = new Set<string>();
		return [...(this.#options.fields() ?? []), ...this.#registered].filter((f) => !seen.has(f.name) && Boolean(seen.add(f.name)));
	}

	#domChanges = $derived.by(() => {
		void this.#version;
		const form = this.#form;
		return form ? diffForm(form, this.fields, this.#options.words?.() ?? CHANGE_WORDS) : [];
	});

	/** What changed, in field order. */
	get changes(): SettingsChange[] {
		return this.#options.changes() ?? this.#domChanges;
	}

	get dirtyCount(): number {
		return this.changes.length;
	}

	/** The result to show: the handler's own until the next submit, else the prop. */
	get result(): SettingsResult | undefined {
		return this.#handled ? this.#result : this.#options.result();
	}

	get pending(): boolean {
		return this.#options.pending() ?? this.#running;
	}

	get status(): SettingStatus {
		if (this.pending) return 'pending';
		const result = this.result;
		if (result?.conflict) return 'conflict';
		if (hasFailure(result)) return 'error';
		if ((this.#saved || result?.notice) && this.dirtyCount === 0) return 'saved';
		return 'idle';
	}

	/** The form-level error to show (`role=alert`, `data-form-error`). */
	get error(): string | undefined {
		return this.result?.error;
	}

	/** A success message from the result, if any. */
	get notice(): string | undefined {
		return this.status === 'saved' ? this.result?.notice : undefined;
	}

	get conflict(): SettingsConflict | undefined {
		return this.result?.conflict;
	}

	isDirty(name: string): boolean {
		return this.changes.some((c) => c.name === name);
	}

	/** The saved value's text while `name` has an unsaved change ("was 90 days"). */
	previous(name: string): string | undefined {
		return this.changes.find((c) => c.name === name)?.from;
	}

	/** The error for one field; hidden once the person edits that field. */
	fieldError(name: string): string | undefined {
		if (this.#edited.has(name)) return undefined;
		return this.result?.errors?.[name];
	}

	/**
	 * Adds a field descriptor (a SettingsRow with `name` does this), so its changes are labelled.
	 *
	 * @returns A function that removes it again (call it on unmount).
	 */
	register(field: SettingsFieldDescriptor): () => void {
		// Rows call this from an effect: read without tracking, or the effect would re-run itself.
		untrack(() => (this.#registered = [...this.#registered, field]));
		return () => {
			untrack(() => (this.#registered = this.#registered.filter((f) => f !== field)));
		};
	}

	/** Attach to the `<form>`: tracks edits, resets and the last edited control. */
	readonly attach: Attachment<HTMLFormElement> = (form) => {
		this.#form = form;
		const edited = (event: Event) => {
			const target = event.target as (HTMLElement & { name?: unknown; form?: unknown }) | null;
			// A control that posts with another form (a dialog's own form, a `form` attribute) bubbles here too.
			if (target && 'form' in target && target.form !== form) return;
			if (target instanceof HTMLElement) this.#lastEdited = target;
			const name = target?.name;
			if (typeof name === 'string' && name && !this.#edited.has(name)) this.#edited = new Set([...this.#edited, name]);
			this.#saved = false;
			this.#leaveFailed = false;
			this.#leaving = false;
			this.#version++;
		};
		// `reset` fires before the controls reset, so re-read on the next task.
		const reset = () => {
			setTimeout(() => {
				this.#saved = false;
				this.#version++;
			});
		};
		form.addEventListener('input', edited);
		form.addEventListener('change', edited);
		form.addEventListener('reset', reset);
		// A lock (a disabled fieldset or control) fires no input event, but a disabled control
		// neither posts nor counts as unsaved: re-read the change list when one is switched.
		const switched = new MutationObserver((records) => {
			if (records.some((r) => r.target instanceof Element && r.target.matches('input, select, textarea, fieldset'))) this.#version++;
		});
		switched.observe(form, { subtree: true, attributes: true, attributeFilter: ['disabled'] });
		// Svelte runs an attachment inside an effect: bump without reading, or it would re-run itself.
		untrack(() => this.#version++);
		return () => {
			form.removeEventListener('input', edited);
			form.removeEventListener('change', edited);
			form.removeEventListener('reset', reset);
			switched.disconnect();
			if (this.#form === form) this.#form = null;
		};
	};

	/** Bind to the form's `onsubmit`. */
	readonly onsubmit = (event: SubmitEvent): void => {
		if (this.pending) {
			// Stop listeners added after this one too (SvelteKit's enhance ignores defaultPrevented).
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		const generation = ++this.#generation;
		this.#edited = new Set();
		this.#saved = false;
		const handler = this.#options.submit();
		if (!handler) {
			// A native post (or enhance): the prop result arrives with the next render.
			this.#handled = false;
			return;
		}
		event.preventDefault();
		const form = event.currentTarget as HTMLFormElement;
		const data = new FormData(form, event.submitter);
		const submitted = snapshotForm(form);
		// Where focus was when the save went out: a failure moves it only if it is still there.
		const focusedAt = { submitter: event.submitter, active: document.activeElement };
		const context: SettingsSubmitContext = { changes: this.changes, revision: this.#options.revision(), data, event };
		this.#handled = true;
		this.#result = undefined;
		let outcome: ReturnType<SettingsSubmitHandler>;
		try {
			outcome = handler(valuesOf(data), context);
		} catch {
			this.#inflight = this.#finish(form, submitted, focusedAt, { error: this.#options.genericError() });
			return;
		}
		if (!isThenable(outcome)) {
			this.#inflight = this.#finish(form, submitted, focusedAt, outcome);
			return;
		}
		this.#running = true;
		this.#inflight = Promise.resolve(outcome).then(
			(result) => (generation === this.#generation ? this.#finish(form, submitted, focusedAt, result) : false),
			() => (generation === this.#generation ? this.#finish(form, submitted, focusedAt, { error: this.#options.genericError() }) : false)
		);
	};

	/** Discard: a native form reset, back to the server-rendered (saved) values. */
	discard(): void {
		this.#form?.reset();
	}

	/** Clears results and forgets a submit in flight (its result is ignored when it settles). */
	clear(): void {
		this.#generation++;
		this.#running = false;
		this.#handled = false;
		this.#result = undefined;
		this.#edited = new Set();
		this.#saved = false;
	}

	/** The control edited last, while it is still in the page (SaveBar returns focus to it). */
	lastEdited(): HTMLElement | null {
		return this.#lastEdited?.isConnected ? this.#lastEdited : null;
	}

	/**
	 * `submitted`: the controls' values when the save was submitted, which become the saved ones on
	 * success. `focusedAt`: the submitter and the focused element then.
	 */
	async #finish(
		form: HTMLFormElement,
		submitted: readonly ControlSnapshot[],
		focusedAt: { submitter: HTMLElement | null; active: Element | null },
		result: void | SettingsResult
	): Promise<boolean> {
		this.#running = false;
		this.#result = result || undefined;
		if (!hasFailure(result)) {
			adoptSnapshotAsDefaults(submitted);
			this.#saved = true;
			this.#version++;
			await tick();
			// The save took the focused control away with what it settled (Enter in a conflict review
			// that closed): back to the fields. A button that only went off is SaveBar's to handle.
			const gone = focusedAt.active instanceof HTMLElement && !focusedAt.active.isConnected;
			if (gone && form.isConnected && focusLost()) restoreFocus(this.lastEdited(), ...firstFields(form));
			return true;
		}
		await tick();
		const active = document.activeElement;
		// Someone who moved on to another control while the save ran keeps their place: the alert is announced.
		if (!focusLost() && active !== focusedAt.active && active !== focusedAt.submitter) return false;
		const target = firstInvalidControl(form) ?? form.querySelector<HTMLElement>('[data-form-error]');
		target?.focus();
		return false;
	}

	/**
	 * Saves for "Save and leave". A save already in flight is waited for, not repeated (a second
	 * submit while pending is ignored); if edits were made since it was sent, they are saved next.
	 *
	 * @returns Whether everything is saved now.
	 */
	async #saveForLeave(): Promise<boolean> {
		if (this.pending) {
			const inflight = this.#inflight;
			// Pending from the `pending` prop (SvelteKit enhance): nothing here to wait for.
			if (!inflight || !(await inflight)) return false;
			if (this.dirtyCount === 0) return true;
		}
		const form = this.#form;
		this.#inflight = null;
		if (!form || !this.#options.submit()) {
			// No handler: a native post would navigate away by itself; keep the person here to save.
			return false;
		}
		form.requestSubmit();
		const inflight = this.#inflight as Promise<boolean> | null;
		return inflight ? inflight : false;
	}

	/** The leave guard. */
	readonly guard = (() => {
		// The getters below read the draft, not the guard object they live on.
		const draft = this;
		const shouldBlock = () => (draft.#options.guardLeave?.() ?? true) && draft.dirtyCount > 0 && !draft.#leaving;
		return {
			/** True while leaving would lose unsaved changes. */
			get shouldBlock(): boolean {
				return shouldBlock();
			},
			/** True while a held navigation waits for a decision (SettingsForm shows its dialog). */
			get pendingLeave(): boolean {
				return draft.#proceed !== null;
			},
			/** True when "Save and leave" could not save (the dialog shows the failure). */
			get failed(): boolean {
				return draft.#leaveFailed;
			},
			/**
			 * Call from your router before it navigates (`beforeNavigate`): when this returns true,
			 * cancel that navigation; `proceed` runs once the person chooses to leave.
			 *
			 * @returns False when nothing would be lost: let the navigation go.
			 */
			request(proceed: () => void): boolean {
				if (!shouldBlock()) return false;
				draft.#leaveFailed = false;
				draft.#proceed = proceed;
				return true;
			},
			/** The person's choice in the leave dialog. */
			async decide(decision: 'save' | 'leave' | 'stay'): Promise<void> {
				const proceed = draft.#proceed;
				if (!proceed) return;
				if (decision === 'stay') {
					draft.#proceed = null;
					return;
				}
				if (decision === 'save') {
					const saved = await draft.#saveForLeave();
					if (draft.#proceed !== proceed) return;
					if (!saved) {
						draft.#leaveFailed = true;
						return;
					}
				}
				draft.#proceed = null;
				// Stays set until the next edit, so the router's guard lets this navigation through
				// even when it asks again after an await.
				draft.#leaving = true;
				proceed();
			},
			/** Bind on `<svelte:window onbeforeunload>`: the browser asks before closing the tab while dirty. */
			beforeunload: (event: BeforeUnloadEvent): void => {
				if (!shouldBlock()) return;
				event.preventDefault();
				event.returnValue = '';
			}
		};
	})();
}
