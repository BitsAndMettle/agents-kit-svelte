/**
 * Dialog: a modal layer on a native `<dialog>` opened with `showModal()`.
 * Covers Dialog, AlertDialog (`role: 'alertdialog'`), Sheet/Drawer (styling only) and
 * the CommandPalette shell.
 *
 * Parts:
 *   trigger      button that opens it (no id: see parts.ts "Ids"): aria-haspopup="dialog", aria-expanded, aria-controls
 *   content      the <dialog> itself (typed: only spreadable on <dialog>)
 *   title        heading: id wired to aria-labelledby
 *   description  optional: wired to aria-describedby only while it is mounted
 *   close        any button that closes it with reason 'close-button'
 */
import { untrack } from 'svelte';
import { createAttachmentKey, type Attachment } from 'svelte/attachments';
import { Layer, type FocusTarget } from '../runtime/layers.svelte';
import {
	cleanups,
	listen,
	part,
	read,
	subId,
	type ChangeReason,
	type Dismiss,
	type MaybeGetter,
	type OpenState,
	type Part
} from '../runtime/parts';

export type DialogOptions = OpenState & {
	/** From the component's `$props.id()`. Required: the only SSR-safe id source. */
	id: string;
	/** 'alertdialog' also defaults dismiss.outside to false. */
	role?: 'dialog' | 'alertdialog';
	/**
	 * Default: Escape closes; backdrop press closes for 'dialog', not for 'alertdialog'.
	 * Function forms veto (e.g. unsaved changes).
	 */
	dismiss?: MaybeGetter<Dismiss>;
	/**
	 * Default 'native': the browser focuses `[autofocus]` inside, else the first focusable.
	 * Put `autofocus` on the Cancel button of a destructive AlertDialog.
	 */
	initialFocus?: FocusTarget;
};

export class Dialog {
	readonly #layer: Layer;
	readonly #id: string;
	readonly #options: DialogOptions;
	#own = $state(false); // uncontrolled desired state
	#hasTitle = $state(false);
	#hasDescription = $state(false);

	readonly #keys = {
		trigger: createAttachmentKey(),
		content: createAttachmentKey(),
		title: createAttachmentKey(),
		description: createAttachmentKey(),
		close: createAttachmentKey()
	};
	readonly #attachTrigger: Attachment<HTMLButtonElement>;
	readonly #attachTitle: Attachment<HTMLElement>;
	readonly #attachDescription: Attachment<HTMLElement>;
	readonly #attachClose: Attachment<HTMLButtonElement>;

	constructor(options: DialogOptions) {
		this.#options = options;
		this.#id = options.id;
		this.#own = options.defaultOpen ?? false;
		this.#layer = new Layer({
			id: options.id,
			kind: 'modal',
			dismiss: () => ({
				escape: true,
				outside: options.role !== 'alertdialog',
				focusOut: false,
				...(options.dismiss === undefined ? {} : read(options.dismiss))
			}),
			desired: () => this.open,
			notify: (open, reason) => this.#write(open, reason),
			initialFocus: () => options.initialFocus ?? 'native'
		});
		this.#attachTrigger = (el) =>
			untrack(() =>
				cleanups(
					this.#layer.attachTrigger(el),
					listen(el, 'click', () => this.#write(!this.open, 'trigger'))
				)
			);
		this.#attachTitle = () => {
			this.#hasTitle = true;
			return () => (this.#hasTitle = false);
		};
		this.#attachDescription = () => {
			this.#hasDescription = true;
			return () => (this.#hasDescription = false);
		};
		this.#attachClose = (el) => untrack(() => listen(el, 'click', () => this.#write(false, 'close-button')));
	}

	/** Desired open state. Setting it is idempotent and reports reason 'api'. */
	get open(): boolean {
		return this.#options.open ? this.#options.open() : this.#own;
	}
	set open(value: boolean) {
		this.#write(value, 'api');
	}

	/** Shown state as rendered: 'open' only after showModal ran, 'closed' as soon as closing starts. */
	get state(): 'open' | 'closed' {
		return this.#layer.state;
	}

	get trigger(): Part<HTMLButtonElement> {
		return part(this.#keys.trigger, this.#attachTrigger, {
			type: 'button',
			'aria-haspopup': 'dialog',
			'aria-expanded': this.open,
			'aria-controls': subId(this.#id, 'content'),
			'data-state': this.#layer.state
		});
	}

	/** No `open` attribute, ever: that would open it non-modally during SSR. */
	get content(): Part<HTMLDialogElement> {
		return part<HTMLDialogElement>(this.#keys.content, this.#layer.attachContent, {
			id: subId(this.#id, 'content'),
			role: this.#options.role === 'alertdialog' ? 'alertdialog' : undefined,
			'aria-labelledby': this.#hasTitle ? subId(this.#id, 'title') : undefined,
			'aria-describedby': this.#hasDescription ? subId(this.#id, 'description') : undefined,
			'data-state': this.#layer.state
		});
	}

	get title(): Part {
		return part(this.#keys.title, this.#attachTitle, { id: subId(this.#id, 'title') });
	}

	get description(): Part {
		return part(this.#keys.description, this.#attachDescription, { id: subId(this.#id, 'description') });
	}

	get close(): Part<HTMLButtonElement> {
		return part(this.#keys.close, this.#attachClose, { type: 'button' });
	}

	#write(open: boolean, reason: ChangeReason): void {
		if (open === this.open) return;
		if (this.#options.open) {
			this.#options.onOpenChange(open, reason);
		} else {
			this.#own = open;
			this.#options.onOpenChange?.(open, reason);
		}
	}
}
