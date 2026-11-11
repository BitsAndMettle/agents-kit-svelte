import { tick, untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { isThenable } from '../../core/promise';
import { adoptCurrentAsDefaults, CHANGE_WORDS, diffForm, type ChangeWords } from './diff';
import type { SettingStatus, SettingsChange, SettingsConflict, SettingsFieldDescriptor, SettingsHandler, SettingsResult } from './types';

export { readDefaults, readCurrent, diffForm, describeChanges, adoptCurrentAsDefaults, sameValue, CHANGE_WORDS } from './diff';
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
	return Boolean(result && (result.error || result.conflict || Object.values(result.errors ?? {}).some(Boolean)));
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
 *   a form error, or a conflict (the draft is kept). Success makes the current values the new
 *   defaults, so the form is clean and Discard restores what was saved.
 * - After a failed submit, focus goes to the first invalid control or `[data-form-error]`.
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
		this.#registered = [...this.#registered, field];
		return () => {
			this.#registered = this.#registered.filter((f) => f !== field);
		};
	}

	/** Attach to the `<form>`: tracks edits, resets and the last edited control. */
	readonly attach: Attachment<HTMLFormElement> = (form) => {
		this.#form = form;
		const edited = (event: Event) => {
			const target = event.target as (HTMLElement & { name?: unknown }) | null;
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
		this.#version++;
		return () => {
			form.removeEventListener('input', edited);
			form.removeEventListener('change', edited);
			form.removeEventListener('reset', reset);
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
		const context: SettingsSubmitContext = { changes: this.changes, revision: this.#options.revision(), data, event };
		this.#handled = true;
		this.#result = undefined;
		let outcome: ReturnType<SettingsSubmitHandler>;
		try {
			outcome = handler(valuesOf(data), context);
		} catch {
			this.#inflight = this.#finish(form, { error: this.#options.genericError() });
			return;
		}
		if (!isThenable(outcome)) {
			this.#inflight = this.#finish(form, outcome);
			return;
		}
		this.#running = true;
		this.#inflight = Promise.resolve(outcome).then(
			(result) => (generation === this.#generation ? this.#finish(form, result) : false),
			() => (generation === this.#generation ? this.#finish(form, { error: this.#options.genericError() }) : false)
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

	async #finish(form: HTMLFormElement, result: void | SettingsResult): Promise<boolean> {
		this.#running = false;
		this.#result = result || undefined;
		if (!hasFailure(result)) {
			adoptCurrentAsDefaults(form);
			this.#saved = true;
			this.#version++;
			return true;
		}
		await tick();
		const target =
			form.querySelector<HTMLElement>('[aria-invalid="true"]:not([disabled])') ??
			form.querySelector<HTMLElement>('[data-form-error]');
		target?.focus();
		return false;
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
					const form = draft.#form;
					draft.#inflight = null;
					if (!form || !draft.#options.submit()) {
						// No handler: a native post would navigate away by itself; keep the person here to save.
						draft.#leaveFailed = true;
						return;
					}
					form.requestSubmit();
					const saved = draft.#inflight ? await draft.#inflight : false;
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
