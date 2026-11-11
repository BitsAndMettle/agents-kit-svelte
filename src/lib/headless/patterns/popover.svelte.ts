/**
 * Popover: a non-modal anchored layer on the `popover="manual"` attribute (top layer,
 * no portal, no z-index). The general floating surface. A consumer's custom floating
 * thing (colour picker, date picker, hover-less card) is a Popover with their own markup.
 *
 * Parts:
 *   trigger   toggles (no id: see parts.ts "Ids"); aria-haspopup (configurable), aria-expanded, aria-controls
 *   anchor    optional: position against this element instead of the trigger
 *   content   the floating element: popover="manual", id, role, tabindex=-1, data-state, data-side
 *   title / description / close  same as Dialog
 */
import { untrack } from 'svelte';
import { createAttachmentKey, type Attachment } from 'svelte/attachments';
import { DEFAULT_PLACEMENT, type Placement, type Side } from '../logic/placement';
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

export type PopoverOptions = OpenState & {
	/** From the component's `$props.id()`. */
	id: string;
	/** Default { side: 'bottom', align: 'center', offset: 4 }. */
	placement?: MaybeGetter<Placement>;
	/** Default { escape: true, outside: true, focusOut: true }. Function forms veto. */
	dismiss?: MaybeGetter<Dismiss>;
	/** Default 'content' (the surface gets tabindex=-1 and focus) unless `[autofocus]` inside took it. */
	initialFocus?: FocusTarget;
	/** role on content; default 'dialog'. */
	role?: string;
	/** aria-haspopup on the trigger; default 'dialog'. */
	haspopup?: 'dialog' | 'menu' | 'listbox' | 'true';
};

export class Popover {
	readonly #layer: Layer;
	readonly #id: string;
	readonly #options: PopoverOptions;
	#own = $state(false);
	#hasTitle = $state(false);
	#hasDescription = $state(false);

	readonly #keys = {
		trigger: createAttachmentKey(),
		anchor: createAttachmentKey(),
		content: createAttachmentKey(),
		title: createAttachmentKey(),
		description: createAttachmentKey(),
		close: createAttachmentKey()
	};
	readonly #attachTrigger: Attachment<HTMLButtonElement>;
	readonly #attachTitle: Attachment<HTMLElement>;
	readonly #attachDescription: Attachment<HTMLElement>;
	readonly #attachClose: Attachment<HTMLButtonElement>;

	constructor(options: PopoverOptions) {
		this.#options = options;
		this.#id = options.id;
		this.#own = options.defaultOpen ?? false;
		this.#layer = new Layer({
			id: options.id,
			kind: 'popover',
			dismiss: () => ({
				escape: true,
				outside: true,
				focusOut: true,
				...(options.dismiss === undefined ? {} : read(options.dismiss))
			}),
			desired: () => this.open,
			notify: (open, reason) => this.#write(open, reason),
			initialFocus: () => options.initialFocus ?? 'native',
			placement: () => (options.placement === undefined ? DEFAULT_PLACEMENT : read(options.placement))
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

	get state(): 'open' | 'closed' {
		return this.#layer.state;
	}

	/** Measured side after flip (both positioning strategies); null until first shown. */
	get side(): Side | null {
		return this.#layer.side;
	}

	get trigger(): Part<HTMLButtonElement> {
		return part(this.#keys.trigger, this.#attachTrigger, {
			type: 'button',
			'aria-haspopup': this.#options.haspopup ?? 'dialog',
			'aria-expanded': this.open,
			'aria-controls': subId(this.#id, 'content'),
			'data-state': this.#layer.state
		});
	}

	get anchor(): Part {
		return part(this.#keys.anchor, this.#layer.attachAnchor, {});
	}

	get content(): Part {
		const placement = this.#options.placement === undefined ? DEFAULT_PLACEMENT : read(this.#options.placement);
		return part(this.#keys.content, this.#layer.attachContent, {
			id: subId(this.#id, 'content'),
			popover: 'manual',
			role: this.#options.role ?? 'dialog',
			tabindex: -1,
			'aria-labelledby': this.#hasTitle ? subId(this.#id, 'title') : undefined,
			'aria-describedby': this.#hasDescription ? subId(this.#id, 'description') : undefined,
			'data-state': this.#layer.state,
			'data-side': this.#layer.side ?? placement.side ?? 'bottom'
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
