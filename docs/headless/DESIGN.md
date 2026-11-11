# Candidate A: pattern classes that hand out spreadable Parts over one layer chain

## Problem

agents-kit-svelte needs a public `agents-kit-svelte/headless` entry that gives Svelte 5 authors the hard accessibility behaviours: focus management, layered dismissal, roving focus, typeahead, anchored positioning and ARIA/id wiring. It must have zero runtime dependencies, be SSR-safe, and use `<dialog>`, `popover`, the top layer and CSS anchor positioning. It is the base for about fifteen styled components (Dialog through Toast region), and consumers must be able to build their own markup on it.

Three things make the shape non-obvious:

1. **Too many state owners.** The browser has state of its own: `popover="auto"` light dismiss and its nesting stack, `<dialog>` `cancel` on Escape or Android back, and the anchor-positioning fallbacks it picks silently. The app has its own state (`bind:open`). Nested layers need one ordering. If any two of these can each close a layer, menus close "through" dialogs and focus lands on `<body>`.
2. **Svelte's mechanics.** Attachments re-run when their function identity changes. A spread's last key wins. Kit components forward `...rest` to their root, which the contract test checks literally with `/<[a-z]+ \{\.\.\.rest\}/`. Only components can call `$props.id()`. The node unit tests cannot follow extensionless relative imports.
3. **Hand-rolled precedent.** The kit already hand-rolls these behaviours. `GitHubPrActionBar.svelte` has a window keydown, a window pointerdown, a focusout check and a manual `trigger?.focus()`, all in one component and none aware of any other open layer.

Constraints this design honours: zero runtime deps, peer `svelte` raised to `^5.29.0` (`createAttachmentKey` and attachments in spreads; `$props.id()` is 5.20), nothing touching `window`/`document` at import or during SSR, pure logic in self-contained files for `node --test`, and the kit component contract (`...rest` on root, `cn()` for class, `--ak-*` tokens).

## Usage (caller's view)

### Quickstart (README)

```svelte
<script lang="ts">
	import { Menu } from 'agents-kit-svelte/headless';
	const id = $props.id();
	const menu = new Menu({ id });
</script>

<button {...menu.trigger}>Options</button>
<div {...menu.content}>
	<div {...menu.item({ value: 'copy', onSelect: copy })}>Copy</div>
	<div {...menu.item({ value: 'delete', onSelect: remove })}>Delete</div>
</div>
```

The model is short:

- **Construct one pattern** per widget in the component script, passing `id` from `const id = $props.id()`. That is the only SSR-safe id source, and the type requires it. Svelte allows `$props.id()` only as a top-level variable initialiser, so it cannot be called inline in the options object. One component with two widgets derives `${id}-a` and `${id}-b`.
- **Spread its parts** onto your own elements. A part is a plain object holding attributes plus one attachment, with no handlers, no class and no style. Spread order does not affect behaviour. When you also forward `rest`, spread `rest` first so the part's ids and `aria-*` win. Two parts can share one element (`<button {...menu.trigger} {...tip.trigger}>`). A part also passes through any kit component's `...rest` (`<Button {...menu.trigger}>`).
- **State follows Svelte's normal rules.** Pass `open: () => open, onOpenChange: (v) => (open = v)` to control it, or nothing to let the pattern own it. `menu.open = true` works in both cases and is idempotent.
- **Style through data attributes:** `data-state="open|closed"`, `data-side`, `data-highlighted`, `data-selected`, `data-disabled`, plus the `--ak-available-height` and `--ak-anchor-width` CSS variables.

The exported patterns are `Dialog`, `Popover`, `Tooltip`, `Menu`, `Select`, `Combobox`, `Listbox`, `Tabs`, `Accordion`, `RadioGroup`, `ToggleGroup` and `Toaster`. `ListNav` is the building block for custom composites.

### Call site 1: styled `Dialog.svelte` (also AlertDialog and Sheet)

```svelte
<!-- src/lib/overlays/Dialog.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLDialogAttributes } from 'svelte/elements';
	import { X } from '@lucide/svelte';
	import { Dialog, type Part } from '../entries/headless';
	import { cn } from '../ui/cn';
	import { buttonClass } from '../ui/styles';

	interface Props extends Omit<HTMLDialogAttributes, 'class' | 'children' | 'open' | 'title'> {
		/** Bindable. */
		open?: boolean;
		title: string;
		description?: string;
		/** 'alertdialog' disables backdrop dismissal; put `autofocus` on the safe button. */
		role?: 'dialog' | 'alertdialog';
		/** 'center' dialog or edge sheet. */
		placement?: 'center' | 'right' | 'bottom';
		/** Renders the opener; receives the trigger part to spread. */
		trigger?: Snippet<[Part<HTMLButtonElement>]>;
		children?: Snippet;
		footer?: Snippet<[close: () => void]>;
		class?: string;
	}

	let {
		open = $bindable(false),
		title,
		description,
		role = 'dialog',
		placement = 'center',
		trigger,
		children,
		footer,
		class: className = '',
		...rest
	}: Props = $props();

	const id = $props.id();
	const dialog = new Dialog({
		id,
		role,
		open: () => open,
		onOpenChange: (next) => (open = next)
	});
</script>

{@render trigger?.(dialog.trigger)}

<dialog
	{...rest}
	{...dialog.content}
	class={cn(
		'ak-dialog border border-chat-border bg-card-bg p-5 text-fg ak-shadow-soft backdrop:bg-black/40',
		placement === 'center' && 'm-auto w-[min(32rem,calc(100vw-2rem))] rounded-[16px]',
		placement === 'right' && 'my-0 ml-auto mr-0 h-dvh max-h-none w-[min(26rem,100vw)]',
		placement === 'bottom' && 'mx-0 mb-0 mt-auto w-full max-w-none rounded-t-[16px]',
		className
	)}
>
	<h2 {...dialog.title} class="text-base font-semibold">{title}</h2>
	{#if description}
		<p {...dialog.description} class="mt-1 text-sm text-fg-light">{description}</p>
	{/if}
	<div class="mt-4">{@render children?.()}</div>
	{#if footer}<div class="mt-5 flex justify-end gap-2">{@render footer(() => (open = false))}</div>{/if}
	<button {...dialog.close} class={buttonClass('ghost', 'icon', 'absolute right-3 top-3')} aria-label="Close">
		<X aria-hidden="true" />
	</button>
</dialog>
```

Consumer:

```svelte
<Dialog title="Delete this run?" role="alertdialog" bind:open={confirming}>
	{#snippet trigger(t)}<button {...t} class={pillClass('secondary', 'md')}>Delete</button>{/snippet}
	This removes the run and its logs.
	{#snippet footer(close)}
		<button autofocus onclick={close} class={pillClass('secondary', 'md')}>Cancel</button>
		<button onclick={() => { remove(); close(); }} class={pillClass('danger', 'md')}>Delete</button>
	{/snippet}
</Dialog>
```

The component never writes focus trapping, Escape handling, backdrop detection, scroll lock, focus return or `aria-labelledby`/`aria-describedby` wiring. `aria-describedby` appears only while the description is mounted. The animation is plain CSS on `[data-state]` with `@starting-style`, inside `@media (prefers-reduced-motion: no-preference)`.

### Call site 2: styled `DropdownMenu.svelte` with submenus, checkbox and radio items

```svelte
<!-- src/lib/overlays/DropdownMenu.svelte -->
<script lang="ts" module>
	import type { Component } from 'svelte';
	export type MenuEntry =
		| { kind?: 'item'; value: string; label: string; icon?: Component; shortcut?: string; disabled?: boolean; onSelect?: () => void }
		| { kind: 'checkbox'; value: string; label: string; checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean }
		| { kind: 'radio'; name: string; label?: string; value: string | null; options: { value: string; label: string }[]; onValueChange: (v: string) => void }
		| { kind: 'submenu'; value: string; label: string; icon?: Component; items: MenuEntry[]; disabled?: boolean }
		| { kind: 'separator' };
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { Check, ChevronRight, Dot } from '@lucide/svelte';
	import { Menu, type Placement } from '../entries/headless';
	import { cn } from '../ui/cn';
	import { pillClass } from '../ui/styles';

	interface Props extends Omit<HTMLButtonAttributes, 'class' | 'children'> {
		items: MenuEntry[];
		/** Trigger content. */
		children: Snippet;
		placement?: Placement;
		open?: boolean;
		class?: string;
	}

	let { items, children, placement = { side: 'bottom', align: 'start' }, open = $bindable(false), class: className = '', ...rest }: Props = $props();

	const id = $props.id();
	const menu = new Menu({ id, placement: () => placement, open: () => open, onOpenChange: (v) => (open = v) });

	const SURFACE = 'min-w-48 max-h-(--ak-available-height) overflow-auto rounded-[12px] border border-chat-border bg-card-bg p-1 ak-shadow-soft-sm';
	const ITEM = 'group flex cursor-default items-center gap-2 rounded-[8px] px-2 py-1.5 text-sm outline-none data-highlighted:bg-canvas-secondary data-disabled:opacity-50';
</script>

<button {...rest} {...menu.trigger} class={cn(pillClass('secondary', 'md'), className)}>{@render children()}</button>
{@render list(menu, items)}

{#snippet list(m: Menu, entries: MenuEntry[])}
	<div {...m.content} class={SURFACE}>
		{#each entries as entry, i (entry.kind === 'separator' ? `sep-${i}` : entry.kind === 'radio' ? `radio-${entry.name}` : entry.value)}
			{#if entry.kind === 'separator'}
				<div {...m.separator} class="my-1 h-px bg-chat-border"></div>
			{:else if entry.kind === 'checkbox'}
				<div {...m.checkbox({ value: entry.value, disabled: entry.disabled, checked: () => entry.checked, onCheckedChange: entry.onCheckedChange })} class={ITEM}>
					<Check aria-hidden="true" class="size-4 invisible group-aria-checked:visible" />{entry.label}
				</div>
			{:else if entry.kind === 'radio'}
				{@const group = m.radioGroup({ name: entry.name, value: () => entry.value, onValueChange: entry.onValueChange })}
				<div {...group.root}>
					{#each entry.options as option (option.value)}
						<div {...group.item({ value: option.value })} class={ITEM}>
							<Dot aria-hidden="true" class="size-4 invisible group-aria-checked:visible" />{option.label}
						</div>
					{/each}
				</div>
			{:else if entry.kind === 'submenu'}
				{@const sub = m.submenu(entry.value, { disabled: entry.disabled })}
				<div {...sub.trigger} class={ITEM}>
					{#if entry.icon}<entry.icon aria-hidden="true" class="size-4" />{/if}
					<span class="flex-1">{entry.label}</span><ChevronRight aria-hidden="true" class="size-4 rtl:rotate-180" />
				</div>
				{@render list(sub, entry.items)}
			{:else}
				<div {...m.item({ value: entry.value, disabled: entry.disabled, onSelect: entry.onSelect })} class={ITEM}>
					{#if entry.icon}<entry.icon aria-hidden="true" class="size-4" />{/if}
					<span class="flex-1">{entry.label}</span>
					{#if entry.shortcut}<kbd class="text-xs text-fg-light">{entry.shortcut}</kbd>{/if}
				</div>
			{/if}
		{/each}
	</div>
{/snippet}
```

The submenu is just another `Menu`, rendered by the same recursive snippet. Its `content` sits inside the parent's `content`, so DOM containment gives the layer stack the parent link with no context and no provider. The stack then handles the rest with no special cases:

- Escape closes only the submenu.
- ArrowLeft closes the submenu, and focus returns to its trigger item through the generic focus-return rule.
- Choosing a leaf closes the root, and the chain closes everything above it top-down.
- Opening a sibling submenu closes the open one, because the chain allows only one open path.

`ContextMenu.svelte` is the same file with `new Menu({ id, trigger: 'contextmenu', … })` and the trigger spread on the target region instead of a button.

### Call site 3: styled `Combobox.svelte` (filtering, activedescendant)

```svelte
<!-- src/lib/forms/Combobox.svelte -->
<script lang="ts" generics="T">
	import type { HTMLAttributes } from 'svelte/elements';
	import { Combobox } from '../entries/headless';
	import { cn } from '../ui/cn';
	import { INPUT_CLASS } from '../ui/styles';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		label: string;
		options: T[];
		getKey: (option: T) => string;
		getLabel: (option: T) => string;
		/** Bindable selected key. */
		value?: string | null;
		placeholder?: string;
		emptyText?: string;
		class?: string;
	}

	let { label, options, getKey, getLabel, value = $bindable(null), placeholder, emptyText = 'No matches', class: className = '', ...rest }: Props = $props();

	let query = $state('');
	const labelOf = (key: string | null) => (key === null ? '' : getLabel(options.find((o) => getKey(o) === key)!));

	const id = $props.id();
	const box = new Combobox({
		id,
		value: () => value,
		onValueChange: (next) => {
			value = next;
			query = labelOf(next);
		}
	});

	const shown = $derived(
		query === labelOf(value) ? options : options.filter((o) => getLabel(o).toLowerCase().includes(query.trim().toLowerCase()))
	);
</script>

<div {...rest} class={cn('grid gap-1', className)}>
	<label {...box.label} class="text-xs text-fg-light">{label}</label>
	<input {...box.input} bind:value={query} {placeholder} class={INPUT_CLASS} />
	<div {...box.list} class="max-h-(--ak-available-height) overflow-auto rounded-[12px] border border-chat-border bg-card-bg p-1 ak-shadow-soft-sm">
		{#each shown as option (getKey(option))}
			<div {...box.option({ value: getKey(option), textValue: getLabel(option) })} class="rounded-[8px] px-2 py-1.5 text-sm data-highlighted:bg-canvas-secondary data-selected:font-medium">
				{getLabel(option)}
			</div>
		{:else}
			<div role="presentation" class="px-2 py-1.5 text-sm text-fg-light">{emptyText}</div>
		{/each}
	</div>
</div>
```

Combobox does not know about filtering. The `{#each}` re-renders the options, ListNav reads them in DOM order at key time, and `autoHighlight` puts the highlight on the first match after each change. Option ids encode the option value, so `aria-activedescendant` stays valid across filters. Typing opens the list, Escape closes it or clears the text, the list matches the input's width, and focus never leaves the input.

### Call site 4: smaller compositions

```svelte
<!-- Tooltip on a menu button: two parts, one element -->
<button {...menu.trigger} {...tip.trigger}>⋯</button>
<div {...tip.content} class="rounded-md bg-fg px-2 py-1 text-xs text-canvas">More actions</div>

<!-- CommandPalette: a Dialog wrapping an inline Combobox that runs commands -->
<script lang="ts">
	const id = $props.id();
	const dialog = new Dialog({ id, open: () => open, onOpenChange: (v) => (open = v) });
	const cmd = new Combobox({ id: `${id}-cmd`, inline: true, onActivate: (v) => { run(v); open = false; } });
</script>
<dialog {...dialog.content}>
	<input {...cmd.input} bind:value={query} autofocus />
	<div {...cmd.list}>{#each hits as c (c.id)}<div {...cmd.option({ value: c.id })}>{c.title}</div>{/each}</div>
</dialog>

<!-- A consumer's own composite: a formatting toolbar on ListNav -->
<script lang="ts">
	import { ListNav } from 'agents-kit-svelte/headless';
	const id = $props.id();
	const nav = new ListNav({ id, focus: 'roving', orientation: 'horizontal' });
</script>
<div role="toolbar" aria-label="Formatting" {...nav.root}>
	{#each tools as t (t.id)}<button {...nav.item({ value: t.id, disabled: t.disabled })} onclick={t.run}>{t.label}</button>{/each}
</div>
```

## Shape

### Module map

```
src/lib/headless/
  logic/                      pure, self-contained (no imports), node --test loads them directly
    layer-chain.ts            open-layer ordering: resolveParent, openLayer, closeLayer,
                              dismissOnEscape, dismissOnPointer, dismissOnFocusOut
    roving.ts                 intentForKey (orientation, rtl, grid), nextIndex, firstEnabled
    typeahead.ts              typeahead(state, input) with time as input
    placement.ts              Placement type, computePosition, sideFromRects, toNativeCss,
                              graceArea + pointInPolygon (submenu hover intent)
  runtime/                    DOM shell, client-only inside attachments
    parts.ts                  Part, MaybeGetter, OpenState, ValueState, Dismiss, ChangeReason,
                              internal part()/read()/subId()
    layers.svelte.ts          LayerStack (document singleton) + Layer (internal)
    position.ts               native/fallback positioning into a constructed stylesheet
    focus.ts                  tabbables, focusQuietly, canFocus (no focus trap: see below)
    list-nav.svelte.ts        ListNav (public building block)
  patterns/                   the public classes; each is Layer and/or ListNav + roles
    dialog.svelte.ts          Dialog
    popover.svelte.ts         Popover
    tooltip.svelte.ts         Tooltip + internal document tooltip slot
    menu.svelte.ts            Menu (+ submenu(), checkbox, radioGroup, group, separator)
    listbox.svelte.ts         Select, Combobox, Listbox over internal ListboxCore
    groups.svelte.ts          Tabs, Accordion, RadioGroup, ToggleGroup
    toaster.svelte.ts         Toaster
src/lib/entries/headless.ts   the only public door (package.json "./headless")
```

Call chains are at most three files deep: pattern, then `Layer`/`ListNav`, then a `logic/*` function. The entry exports the patterns, `ListNav` and the types. `LayerStack`, `Layer`, the tooltip slot, `ListboxCore`, positioning, focus helpers and `logic/*` are not exported, so consumers cannot import them through the package exports map.

### Data structures

**Part** (`runtime/parts.ts`). This is the load-bearing decision.

`Part<E> = HTMLAttributes<E>` restricted by construction to attributes plus one `[createAttachmentKey()]: Attachment<E>`. It never contains `on*` handlers, `class` or `style`:

- **Listeners** are added with `addEventListener` inside the attachment.
- **Positions** go to a kit-owned constructed stylesheet keyed by element id.
- **Collisions are impossible.** No spread order can drop a consumer handler or a behaviour handler, so there is no `mergeProps` to learn or forget.
- **Composition.** Two parts compose on one element.
- **The contract test still holds.** `<dialog {...rest} {...dialog.content}>` keeps the regex literally true.
- **Typing.** Parts are typed by element. `Dialog.content` is `Part<HTMLDialogElement>`, so spreading it on a `<div>` fails `svelte-check`: `Attachment<HTMLDialogElement>` is not assignable to `Attachment<HTMLDivElement>` under `strictFunctionTypes`.
- **Stable attachments.** Each attachment's identity is stable per behaviour (per item value for item parts, through a `Map<value, attachment>`). Setup runs inside `untrack`, and reactive reconciliation runs in nested `$effect`s. Re-spreading on every state change therefore never re-runs an attachment.

**OpenState / ValueState.** These are discriminated unions: controlled means the getter and its writer are both required, and uncontrolled means `defaultOpen`/`defaultValue`. "Controlled but forgot the setter" does not compile. `ChangeReason` (`trigger`, `escape`, `outside`, `focus-out`, `select`, `close-button`, `parent`, `hover`, `api`) is passed to every change callback, so a Toast or analytics consumer can tell an Escape from a selection. Vetoes are separate: function forms in `Dismiss` decide before the stack acts, and `onOpenChange` only notifies.

**The layer chain** (`logic/layer-chain.ts`). Open layers always form one chain, root first. Each layer's parent is the one before it, so open siblings cannot exist:

- **Opening** a layer truncates the chain after its parent, closing the others top-down, then pushes it.
- **The parent** is the deepest chain layer whose content or trigger contains the new layer's trigger element. A layer opened programmatically, with no trigger, stacks on top. DOM containment is the parent link, so there are no contexts, no providers, and no ordering by open time.
- **Every operation** is a pure function `Chain → { chain, close: ids top-down }`. The shell applies the closes in order and restores focus only for the lowest closed layer. Applying the same operation twice yields an empty close list (idempotent).
- **Tooltips** are deliberately outside the chain. One document tooltip slot holds at most one tooltip. That slot is the delay group (warm-up and skip-delay), so there is no provider to forget, and hovering a button never closes an open popover.

**ListNav** (`runtime/list-nav.svelte.ts`). There is no ordered registry. The DOM is the order: at key time, ListNav runs `root.querySelectorAll('[data-ak-nav="<id>"]')`, which is document order, already filtered by whatever `{#each}`/`{#if}` rendered, and which excludes nested navs because submenu items carry the submenu's nav id. Metadata lives in a `WeakMap<Element, ItemOptions>`. The highlight is stored as the item value, never an index. Focus mode (`roving` or `active-descendant`) is structural and fixed at construction. `data-highlighted` is the one styling hook in both modes. The dominant access pattern, "key pressed → next enabled item", is one DOM query plus `nextIndex`, so no index needs to be kept in sync.

### Flows

**Open.** Desired state (the controlled getter or internal `$state`) changes. An `$effect` inside `Layer.attachContent` calls `stack.open(layer)`. The stack then:

1. Records `returnTo` (the active element and its id).
2. Resolves the parent.
3. Applies the closes.
4. Calls `showModal()` or `showPopover()`, guarded by `el.open` / `:popover-open`, so it is idempotent.
5. Sets `shown = true` and syncs scroll lock.
6. Moves focus: `'native'` for dialogs (browser `[autofocus]` or the first focusable), `'first'`/`'last'`/`'content'` for menus depending on the key that opened them, and `'none'` for combobox and tooltip.

**Escape.** A single bubble-phase `keydown` listener on `document` runs `dismissOnEscape`:

- The top layer closes. If its policy refuses, the key is consumed anyway, so nothing closes "through" it.
- When handled, the listener calls `preventDefault()`, which suppresses the native dialog close request. A dialog under a just-closed popover therefore never receives `cancel`.
- Each `<dialog>`'s `cancel` event is also intercepted and routed to the same top-layer escape path. This covers Android back.
- The listener is in the bubble phase, so element-level handlers run first and can claim the key. The Combobox clearing its text is one example.
- The tooltip slot listens in the capture phase and consumes Escape first, so a visible tooltip always closes before anything else.

**Outside pointer-down.** A capture-phase `pointerdown` listener (app code cannot `stopPropagation` it away) does a hit test:

- The hit is the deepest layer whose content or trigger contains the target. A press on the trigger of an open menu is a hit, so clicking the trigger toggles instead of closing and reopening.
- A press whose target is the `<dialog>` itself but whose point lies outside its border box is the backdrop.
- `dismissOnPointer` closes layers above the hit, top-down, stops at the first veto, and never reaches below the top modal's parent.
- Touch decides on `click`, so a scroll gesture is not a dismissal.

**Focus-out (non-modal only).** `relatedTarget` is checked with `stack.containsDeep(layer, node)`, which includes child layers, so focus moving into a submenu is not "out".

**Focus return** (only when focus is inside a closing layer or on `<body>`; a click that moved focus to another control is respected). The first candidate that is connected and focusable wins:

1. `returnTo.el`.
2. `getElementById(returnTo.id)`. This catches a trigger that was re-rendered by a keyed block; its id is stable because it comes from `$props.id()`.
3. The current trigger element.
4. The new top layer's first tabbable element, or its content.
5. Nothing. The code never calls `body.focus()`.

### Native-first decisions

- **Modal is `<dialog>.showModal()`, with no hand-rolled focus trap.** The browser makes everything else inert, so Tab cycles within the dialog and the browser chrome (current APG guidance). This drops the sentinel elements, the `focusin` fights with other libraries, and the shadow-DOM edge cases. AlertDialog, Sheet, Drawer and the CommandPalette shell are all `<dialog>`s.
- **Non-modal surfaces use `popover="manual"`, never `auto`.** They get the top layer (no portals, no z-index) without native light dismiss or the native auto stack. The chain is the only thing that hides a layer. A `toggle` listener adopts and reports any change the browser makes anyway.
- **Positioning uses CSS anchor positioning when supported** (`position-anchor`, `position-area`, `position-try-fallbacks: flip-block, flip-inline`) and the anchor is an element. The fallback (`computePosition`: flip, shift, `matchWidth`, available size) is used otherwise and for context-menu points. Both strategies take the same `Placement` value. Both measure rects after layout to write `data-side` (native anchoring flips silently) and `--ak-available-height`. All of it is written to one constructed stylesheet keyed by id, so consumer `style` cannot clobber it.
- **Accordion panels use `hidden="until-found"`**, so find-in-page reveals them through `beforematch`. **Tabs panels use `hidden`** rather than `{#if}`, so `aria-controls` always resolves.

### Invariants and where they live

| Invariant | Encoded by |
|---|---|
| One owner of layer order, dismissal, focus return, scroll lock | `LayerStack` is unexported; only `Layer` (internal) pushes; one `globalThis[Symbol.for('agents-kit-svelte/layers@1')]` instance even with duplicated package copies |
| Nested Escape closes the topmost only; never "through" a refusing layer | `dismissOnEscape` (pure, tested) |
| Idempotent open/close | Chain ops are no-ops on repeat; DOM calls are guarded by `:popover-open` / `el.open`; `#write` returns early on an unchanged value |
| Controlled state has a writer | `OpenState` / `ValueState` unions |
| Dialog content is a `<dialog>` | `Part<HTMLDialogElement>` |
| Mode-specific parts exist only in that mode | Separate `Select` / `Combobox` / `Listbox` classes over one internal core |
| SSR-safe | Parts are attribute bags; everything DOM lives in attachments; `$props.id()` is required |
| Handlers never collide | Parts contain no `on*`; listeners live in attachments |
| Item order never desyncs | DOM order is read at key time; no registry |

### Interface depth

The public surface has twelve pattern classes and one building block. Each pattern is "construct once, spread parts". Behind it are the chain algebra, the native show/hide reconciliation, the dialog `cancel` and backdrop detection, the touch-aware outside detection, focus return with re-render fallbacks, two positioning strategies, the submenu grace polygon, typeahead timing, activedescendant scrolling, the tooltip warm-up group and toast timer pausing.

No single operation needs the caller to coordinate several calls. Opening is a write or a trigger part, and dismissal, focus and positioning follow from it. The one piece of caller boilerplate is `const id = $props.id()` plus passing it, which Svelte forces (`$props.id()` works only as a top-level initialiser); the alternative was silent hydration mismatches.

### Testing

- **Unit tests** (`node --test`, no DOM): `tests/headless-layer-chain.test.ts`, `-roving`, `-typeahead` and `-placement` import `src/lib/headless/logic/*.ts` directly. Those files have no imports, which satisfies the kit's "no `.ts` extension inside `src/lib`" rule.
- **Playwright**: one showcase catalogue item per pattern (`CATALOG_ITEMS`, `/#dialog`, `/#dropdown-menu`, …). Specs cover:
  - Escape order: tooltip, then submenu, then menu, then dialog.
  - Backdrop versus content press.
  - Focus return after the trigger is re-keyed.
  - Combobox filtering with activedescendant.
  - Native and fallback positioning, with the fallback forced by a `?anchor=fallback` showcase flag.
  - The layout at 360px.
  - Reduced motion.

  CI does not run Playwright yet. Adding the job is the first follow-up, because none of the layer behaviour is provable in node.

## Synthesis decision

**Base: candidate A** (Opus). Two runners: A (Opus, pattern classes + handler-free parts over one layer chain) and B (Sonnet, a public `useSurface`/`useNavigator` kernel + thin recipes). Cross-judge (Sonnet) scored A 5/4/5/5/5/5 and B 3/4/3/4/4/3 on the six rubric criteria and recommended A; the controller's own reading agreed. Both converged on: one document-level layer stack, `popover="manual"` (never `auto`), `showModal()` inertness instead of a hand-rolled trap, parent derived from DOM containment, DOM-ordered items read at key time, required `id` from `$props.id()`, pure import-free logic files, peer `svelte ^5.29.0`. That convergence is strong agreement; ship it.

Why A over B: A's parts carry no handlers and each behaviour has its own attachment key, so two parts compose on one element with no `mergeParts` (B shares one `createAttachmentKey()` symbol, so its own submenu sketch clobbers itself); one way to do each task (B has kernel and recipe tiers); one-file DropdownMenu with submenus/checkbox/radio (B needs three files and the context it rejected); real sketches for Tooltip, Toaster and the groups.

**Grafted from B** (folded in by hand; these amend the sections above and the sketch):

1. **Layer phase `open | closing | closed`.** `close` marks the layer `closing` at once (it stops receiving Escape/pointer verdicts and is removed from the chain), sets `data-state="closed"`, waits for the content's exit animations (`el.getAnimations({ subtree: true })` settled, skipped under reduced motion, capped at 400 ms), then calls `close()`/`hidePopover()`, then restores focus. Re-opening while `closing` cancels the wait and is idempotent. Exit animation CSS uses `transition-behavior: allow-discrete` with `overlay`/`display`, so both native and our wait agree.
2. **ListNav is the single owner of the highlighted item and revalidates it.** A `MutationObserver` on the nav root (childList, subtree) runs while the nav is attached: if the highlighted value no longer matches a rendered, enabled item, the highlight moves to the first enabled item when `autoHighlight` is on, otherwise clears, and `aria-activedescendant` is removed in the same tick. No stale descendant id survives a filter.
3. **Strategy override for tests.** An internal `__setPositionStrategy('native' | 'fallback' | 'auto')`, reachable only from the showcase test page through a query flag that calls it, so every Playwright positioning spec runs under both strategies.

**Fixes from the cross-judge to A itself:**

- **Native closes are reconciled, not assumed preventable.** Chrome's close watcher lets `cancel` be prevented only once per user activation, so a dialog can close natively (Android back, repeated Escape). Every native `close` and `toggle` event is reconciled into pattern state with `ChangeReason` `'native'`, the chain is truncated above that layer, and focus return runs as for any close. Vetoes are best-effort for native closes and documented as such.
- **Focus-out for `focus: 'none'` layers** (Combobox, Tooltip) is decided by the input/trigger blur path, and gets its own Playwright spec.
- **Toaster is deferred** behind a spike: decide whether the region renders inside the topmost open `<dialog>` while one is open. Not in the first build.

**Rejected from B:** the public kernel tier (two ways to do one task), the shared attachment key and `mergeParts`, context-based menu wiring, `position: fixed`-only fallback (A's constructed stylesheet keyed by id also stops consumer `style` clobbering).

## Tradeoffs accepted

- We accept that consumers cannot cancel a behaviour by calling `preventDefault()` in their own `onkeydown`/`onclick`, in exchange for parts that never collide and compose by spreading. Cancelling goes through `dismiss` vetoes, `onSelect` + `event.preventDefault()` and `closeOnSelect`. The one exception is the document-level Escape, which element handlers can still claim because it runs in the bubble phase.
- We accept a required `id` (from `const id = $props.id()`) on every constructor (one line of boilerplate) in exchange for ids that match between SSR and hydration with no global counter.
- We accept that there are no portals. Content stays where it is written and relies on the top layer. A menu inside a `<dialog>` works because it is a DOM descendant. A layer written outside an open modal is inert (see open questions).
- We accept that tooltips are not in the layer chain. They are invisible to `resolveParent`, which is what makes hover safe. The cost is a second small owner, the tooltip slot, which handles only tooltips and claims Escape first.
- We accept the single-chain rule, so two unrelated non-modal popovers cannot be open at once, as with native `popover="auto"`. In exchange, ordering is a list rather than a tree and every rule is a slice.
- We accept a per-frame rect measurement while a native-anchored layer is open, in exchange for a correct `data-side` after silent flips.
- We accept DOM queries on every navigation key (no item registry). This costs O(n) per keypress, which is negligible for menus and lists; virtualised lists are out of scope. In exchange, we never desync after filtering or `{#if}`.

## Alternatives considered

- **Headless compound components** (`<Menu.Root><Menu.Trigger>…`, as in bits-ui). They have a deep surface but hide the element: consumers fight `child` snippets to own their markup, the kit's `...rest`/`cn()` contract applies twice, and context wiring becomes a second parent mechanism next to the layer chain. The task also asks for runes plus attachments.
- **Parts with `on*` handlers plus a public `mergeProps`** (the common builder style). It is just as deep on paper, but every styled component must remember to `mergeProps(rest, part)`. Forgetting it silently drops either the consumer's handler or the behaviour, which is a two-ways-to-do-one-task trap, and it breaks the contract regex. Moving listeners into attachments removes the helper entirely.
- **Native `popover="auto"` and `popovertarget` owning dismissal.** Less code, but the browser and the app would both own open state. A modal opening closes auto popovers by itself. Auto popovers have no veto, no `ChangeReason`, and no notion of tooltip-versus-menu precedence. It also cannot express "menu inside a dialog, Escape closes the menu only" without our own stack anyway.
- **A parent tree from Svelte context** (`createContext`, Svelte 5.40). This needs a provider per layer and peer `>=5.40`, and it breaks for programmatic opens and for consumers composing across component boundaries. Trigger containment gives the same parent with no API.
- **Separate primitive exports** (`trapFocus`, `dismissable`, `anchor`, `roving`, `typeahead` attachments that callers combine). It is maximally flexible but shallow: every component re-coordinates four or five calls, and an agent copying one component copies its mistakes. Only `ListNav` is exposed, because custom composites (toolbars, grids) are the one real need left after the patterns.

## Implementation reconciliation

**Unit 1 (core: logic, runtime, Dialog, Popover, ListNav, entry), branch `ref/headless-core`.** Accepted by the Phase D implementer under the "decide, record, keep going" brief. None changes the shared contract (one chain owner, handler-free parts, DOM-ordered ListNav, native-first). There was no repeated structural workaround, so no Phase E.

Type and shape changes (the next units build on these):

1. **`ChangeReason` gains `'native'`**, as the synthesis decision says; the sketch's union did not have it yet.
2. **`Layer.shown` is replaced by `phase: 'open' | 'closing' | 'closed'`** (graft 1). The internal `setPhase()` also writes `data-state` straight onto the content element, for two reasons. Exit transitions must start before Svelte's next flush. And a closing→open re-open inside one tick would otherwise be skipped by Svelte's attribute diff. `finishClose` is an internal hook the stack uses to complete a pending close early (native close, unmount).
3. **Layer DOM refs (`contentEl`, `triggerEl`, `anchorEl`) are plain fields**, not `$state`, because nothing reacts to them. `phase`, `side` and `anchorPoint` stay `$state`. `attachContent/Trigger/Anchor` are typed `(el) => () => void`, so patterns compose them with their own listeners through the internal `cleanups()` and `listen()` helpers.
4. **`Part<E>` maps button and dialog elements to Svelte's `HTMLButtonAttributes` / `HTMLDialogAttributes`.** `HTMLAttributes<E>` has no `type`, so `Part<HTMLButtonElement>` could not carry `type="button"`.
5. ~~Trigger parts carry `id = ${id}-trigger`~~ **Superseded by red-team fix 9 below: trigger and anchor parts set no id.**
6. **`PositionTarget.placement` is a value, not a getter.** The Layer's positioning `$effect` reads the placement reactively and restarts positioning when it changes.
7. **Placement is physical.** `position.ts` swaps start and end on top/bottom sides in RTL before calling either strategy, so both get the same input. `toNativeCss` uses physical `position-area` keywords. For centre alignment it uses `span-all` plus `justify-self/align-self: anchor-center`, because a single `center` track would squeeze the surface to the anchor's width.
8. **Small additions:**
   - `availableSpace()` in placement: the native strategy writes `--ak-available-*` from measured rects.
   - `isBuffering()` and `TYPEAHEAD_TIMEOUT` in typeahead: the shell needs them to decide whether Space is typed or activates.
   - `activatesNatively()` in focus.
   - The entry exports `type FocusTarget`, because it appears in the public `DialogOptions` and `PopoverOptions`.
9. **Typeahead rule refined:** the first single-letter press starts AFTER the current item (APG). Only a growing multi-character prefix may stay on the current item.
10. **The Popover's default `initialFocus` is `'native'`:** the content element gets focus unless an `[autofocus]` inside already took it. In `focusInitial`, `'content'` forces the surface even over autofocus. `'first'`/`'last'` resolve to tabbables inside the content. Roving items are not tabbable, so **Menu must pass a getter backed by its ListNav**.

Behaviour decisions:

11. **Positioning stylesheet: the whole sheet is re-rendered with `replaceSync`.** Rules are never mutated in place. Chromium was observed leaving a just-shown fallback popover at its static position for more than 200 ms after `rule.style.setProperty` on the adopted sheet, until something else invalidated its style. The fallback now measures and then writes once, with no reset-to-origin write first. Consequence: on a re-measure, shrink-to-fit width can be limited by the previous position's available space (rare; a fixed width avoids it).
12. **ListNav root:**
    - It carries `data-ak-nav-root` so a nested nav's unhandled keys never reach the parent's handler.
    - It sets no `aria-orientation`, which is invalid on role-less containers. Patterns add it alongside their role.
    - In roving mode, Enter/Space on a native activator (button, link) defers to the native click, so the item's click listener activates once and a consumer `onclick` still runs.
13. **Content unmounted while open:** the layer closes immediately (no exit wait) with reason `'parent'`, and focus is restored.
14. **`showModal()`/`showPopover()` throwing** (disconnected element, `open` attribute set by hand) rolls the chain back and notifies `false, 'native'`.
15. **`dialog.close()` called while a popover inside is open:** the browser restores focus to the page first, so the inner popover closes with `'focus-out'`, not `'parent'`. Both are correct; the spec accepts either.
16. **Toggle reconciliation also adopts opens.** A `showModal()`/`showPopover()` from outside the kit is pushed onto the chain with `'native'`.
17. **The headless entry is not re-exported from the package root** (as with `./fixtures`), so `Dialog` and `Popover` never collide with the styled components of the same names.

Kept per the sketch, but the owner may want a second look: a **backdrop press while a popover is open inside the dialog closes both**. `dismissOnPointer` walks down to the top modal's parent. A press on the dialog's own content closes only the popover, and that is what "outside closes topmost only" is tested as.

Evidence:
- 57 `node --test` unit tests across the four logic files; the kit total is 147.
- 21 Playwright specs in `tests/browser/headless/`, including the positioning specs under both forced strategies. They passed 84/84 over 4 repeats, and the position file 120/120 over 15.
- After merging main, `a11y.spec.ts` and the keyboard specs pass 210/210.
- `corepack pnpm check` reports 0/0.
- `publint --pack npm` is clean.

Unproven:
- The touch-deferred outside press.
- `cancel` from Android back (only `dialog.close()` is exercised).
- Function vetoes in a browser (only the chain logic is unit-tested).
- Firefox and Safari (all browser runs used Chromium; the fallback was forced there).

Known risks for later units:
- A consumer `transition: all` (or a transition on `left`/`top`) on a fallback-positioned surface animates its first placement from the popover's UA-centred position. The native strategy is unaffected. Fix candidate: write a provisional rule before `showPopover()`.
- The showcase's reduced-motion reset gives every property a 0.01 ms transition, so measurements taken in the same frame as a placement read the start value. The specs wait for `getAnimations()` to finish. The native per-frame measure self-corrects on the next frame.

**Unit 1 red-team fixes (coordinator-directed).** Each item has a regression spec in `tests/browser/headless/regressions.spec.ts`. Positioning items run under both strategies.

1. **Text owners keep Space and printable keys.** When `event.target` is an input, textarea or contenteditable, ListNav's `handleKey` neither activates on Space nor runs typeahead. Only a non-editable owner (a Select button) activates on Space. Enter and the navigation keys still work, so **Combobox must claim Home/End itself** if the caret should get them.
2. **No page scrolling.** Revalidation and programmatic highlights never scroll. Key navigation focuses with `preventScroll` and then scrolls only the nav's own scroll container: the first scrollable element between the item and the root, the root included. It uses manual `scrollTop`/`scrollLeft` math and never touches ancestors of the root. `highlight()` gained an internal option, `scroll` (`{ focus?, scroll? }`).
3. **The controlled value wins.** After every `notify`, the stack queues a microtask that re-reads `desired()` and re-applies it: it re-opens a layer the consumer refused to close, and closes a native open the consumer refused. Structural `'parent'` closes are exempt, so two refusing siblings cannot ping-pong. Under reduced motion a refused close can flash; `dismiss.escape: () => false` refuses without one.
4. **Roving root handles only keys whose target is one of its own items**, so an input or a nested nav inside the root keeps its keys.
5. **Positioning re-anchors.**
   - `triggerEl` and `anchorEl` are `$state.raw`, and positioning restarts when the anchor changes.
   - Shown-ness is read through a `$derived` `#visible`, so open → closing no longer restarts positioning.
   - When the anchor leaves the document with no replacement, positioning freezes at the last good rect. Native records it each frame; fallback skips updates.
   - `PositionTarget.anchor` is now a value.
6. **The anchor belongs to its layer.** `#holds` counts `anchorEl`, and `#push` uses `triggerEl ?? anchorEl` for parent resolution.
7. **Escape veto in the capture phase.** A capture-phase `keydown` listener consumes Escape when the top layer refuses it, so app code that stops propagation cannot let the browser's close watcher close a vetoing dialog. Policy verdicts are memoised per event, so a veto function runs once.
8. **Lower-priority items, all done:**
   - The fallback divides by `currentCSSZoom`.
   - `cancel` outside an Escape keydown (`requestClose()`, Android back) closes that dialog itself under its own escape policy. During an Escape keydown whose propagation was stopped, `cancel` still takes the top-layer path.
   - Re-opening during closing runs initial focus when focus is not inside the layer.
   - After an outside press, focus on `<body>` is not "lost", so it is not pulled back.
   - Removing the focused roving item moves focus to the new tab stop.
   - The server render gives the first rendered item `tabindex=0`.
   - `pointercancel` resets the touch flag. This one has no browser spec.
   - The sheet, rules, anchor tokens and the forced strategy live on `globalThis[Symbol.for('agents-kit-svelte/position@1')]`.
9. **Id rule, written into `parts.ts` ("Ids").** Compatible with the Menu builder's constraint.
   - Parts set `id` only on elements whose identity they own: layer content, title, description and **ListNav items, whose ids always stay**.
   - Trigger and anchor parts never set an id. Behaviour uses the element the attachment received.
   - Native anchoring marks the anchor with a script-written `data-ak-anchor="<token>"` and the rule `[data-ak-anchor="…"] { anchor-name: … }`, not with its id.
   - A pattern that must reference a trigger by id reads the id its owner set (for a submenu trigger, the ListNav item id), or sets one itself when the trigger is its own and not a nav item.
   - Focus-return fallback 2 still uses whatever id the focused element had. A re-keyed trigger is found by fallback 3, the reactive `triggerEl`.
10. **A focus-out close never returns focus** (`restoreFocus: false`); focus is already where Tab sent it. Without an exit animation, the close used to complete inside `focusout` while `activeElement` was `<body>`, then pulled focus back to the trigger. The spec runs under reduced motion and fails without the fix.
11. **Internal `isRestoringFocus(el)`** is exported from `runtime/layers.svelte.ts`, not from the public entry. It is true while `el` receives focus because the stack returned it, from inside focus/focusin handlers until the next task. It is backed by a `WeakSet` on the shared stack. The Tooltip pattern checks it in its focus handler and does not open for restored focus.

Public API changes for the pattern builders:
- Dialog and Popover trigger parts no longer have an `id`, and the Popover anchor part has none either.
- The ChangeReason semantics are unchanged.

Notes for the next units:
- **Menu.** Build `Layer` directly (kind `'popover'`). The ListNav root's keydown is a bubble listener on the root, so Menu must register its content keydown in the **capture** phase to claim ArrowRight/ArrowLeft on submenu triggers first. Pass `initialFocus` as a getter that calls `nav.highlight('first' | 'last', { focus: true })` and returns `document.activeElement`.
- **Combobox/Select.** In active-descendant mode, `ListNav.handleKey` maps Home/End/PageUp/PageDown. A text input must claim Home/End itself (with its own keydown, registered before the owner part) if caret movement should win.
- **Tooltip.** `position.ts` already stacks several `anchor-name`s on one element. The stack's Escape is bubble-phase on `document`, so a capture-phase tooltip slot handler that calls `preventDefault` preempts it, as designed.

**Unit: Menu, branch `ref/hl-menu`.** No core change. Deviations from the sketch, decided under the brief:

1. **`trigger` is `Part` (any element), not `Part<HTMLButtonElement>`.** One getter serves the menu button, the context-menu region and a submenu's item, so it cannot be typed to one element. The menu-button form still carries `type="button"` (through a cast).
2. **`onSelect` receives a `MenuSelectEvent`** (a cancelable `CustomEvent<{ value, originalEvent }>`, not dispatched), not the raw key or click event. ListNav calls `preventDefault()` on Enter/Space before `onActivate`, so the raw event cannot carry "keep open". `closeOnSelect` exists on plain items too (default true); checkbox and radio default false.
3. **Radio items are keyed `name:value`** in the menu's ListNav, so two groups can both have a `none` option. `highlighted` and item ids show that key.
4. **Options added:** `MenuOptions.disabledFocusable`, `dismiss`, `label` (accessible name for a context menu); `submenu(value, { onOpenChange })`; exported `MenuSubmenuOptions` and `MenuSelectEvent`.
5. **Menu button:** ArrowDown/ArrowUp are handled on keydown; Enter and Space go through the native click and are told apart from a pointer click by `click.detail === 0` (focus first item vs. focus the surface). APG focuses the first item on a pointer click too; the sketch's "click focuses content" was kept.
6. **Tab (and Shift+Tab) inside any level closes the root** with `'focus-out'`, explicitly, before the browser moves focus.
7. **Context menu:** Shift+F10 / ContextMenu open at the centre of the focused element (clamped to the viewport) and focus the first item; a native `contextmenu` that follows the key is swallowed (a flag that every pointer `pointerdown` clears). The region is the layer's trigger, so the stack counts a press in it as a hit; the Menu itself closes on a primary press in the region outside the content (`'outside'`). Menu content always suppresses the native context menu.
8. **Submenu hover:** opens after 100 ms; leaving the trigger while the submenu is open stores `graceArea()` for 300 ms. The parent content's capture-phase `pointermove` stops propagation while the pointer is inside it (siblings get no highlight or hover-open); outside it, moving onto another item closes the open submenu with `'hover'`. Default placement right/start, offset 2, or left in RTL (read from the trigger's `direction`).
9. **Keys on the surface itself** (pointer-opened, nothing highlighted) are passed to `ListNav.handleKey` by the Menu's capture handler, so the Menu does not depend on ListNav's root listener serving non-item targets (red-team item b).
10. **Kept:** disabled items are skipped by default (`disabledFocusable` opts in), as in the sketch; the owner question stays open.

The Menu depends on `ListNav.item` keeping its `id`. A submenu's trigger is a ListNav item with no id of its own, and the native anchor and the submenu's `aria-labelledby` use the item id (red-team item a).

After merging the core fixes: the menu button keeps `id=${id}-trigger`, under the parts.ts rule for a trigger the pattern owns that is not a nav item, because the content's `aria-labelledby` points at it. The context-menu region part no longer sets an id. Key-driven highlights pass `{ focus: true, scroll: true }`. A Tab close (`'focus-out'`) no longer restores focus; the browser's own Tab move lands on the next control, as the spec expects.

**Unit (listbox family: Select, Combobox, Listbox over internal ListboxCore), branch `ref/hl-listbox`.** Accepted by the Phase D implementer under the "decide, record, keep going" brief. No core file changed. The deviations are local and of different shapes, so no Phase E.

1. **New pure file `logic/selection.ts`** (`toggleValue`, `rangeValues`, `addValues`, `toggleAll`, `sameValues`), import-free and unit-tested. It is not a core change. The core keeps selection as `string[]` internally and the facades narrow it to `Selected<Multiple>` (one cast per facade at the generic boundary).
2. **The Select trigger's `aria-labelledby` is the label only**, not "label trigger" as the sketch had it. The combobox role takes its name from the author only, and its value comes from its content, so including the trigger would read the value twice (APG select-only).
3. **Select typeahead while closed**, following the sketch:
   - Single: it changes the value without opening, stepping from the selected option.
   - Multiple: it opens on the match, because a closed list has nowhere to show a highlight.
   - Tab only closes (design), not APG's select-and-close.
   - Enter and Space are handled on keydown. A flag swallows the button's own keyboard click, because Space's click fires on keyup and would toggle the list back.
4. **Combobox Escape when closed (or inline)** clears the text and, in single mode, the selection. It is consumed only when there was text, so an empty CommandPalette lets Escape close its Dialog. The sketch said it was always consumed.
5. **Combobox `autoHighlight` follows the rendered option set.** A MutationObserver (childList) on the list moves the highlight to the first option when the set changes, rather than on each `input` event. This also covers a query the caller resets in code: a reopened palette used to keep its old highlight. ListNav's own revalidation still guarantees no stale id.
6. **Owner blur closes after a `setTimeout`.** Closing inside `focusout` (where `activeElement` is `<body>`) with no exit animation made focus return pull focus back to the owner, which undid Tab. Core item 10 (focus-out never pulls focus back) does not cover this path:
   - It sets `restoreFocus: false` only on the stack's own content-`focusout` path.
   - This blur closes through desired state (`stack.close(layer, 'api')`), which still treats `<body>` as lost focus.
   - So the deferral stays after the core merge, and the Tab specs (Select, Combobox) prove it.
   A Layer-level "close as focus-out" entry would let it go.
7. **Single Listbox: selection does not follow focus.** Arrows move the highlight, and Enter, Space or a click selects. Multiple implements APG's recommended model: Shift+Arrow, Shift+Space range, Ctrl+Shift+Home/End, Ctrl/Cmd+A toggle-all, Shift+click range. The list takes focus explicitly on mousedown, because ListNav prevents option mousedown.
8. **Parts and attributes:**
   - The `option` part is ListNav's item part plus role, `aria-selected` and `data-selected`. Its only id is the ListNav item id (`${id}-item-<value>`).
   - `label` (Combobox) carries `for` and `input` carries `autocomplete="off"`, typed through an intersection annotation, so the `Part` mapping in `parts.ts` is unchanged.
   - `group()` parts are attribute-only.
   - After the core id rule: the Select `trigger` sets no id. The Combobox `input` keeps `${id}-input`, because the label's `for` needs it. The input is the pattern's own element and never a nav item, which the rule allows.
   - Highlights the person can see (list focus, Ctrl+Shift+Home/End, autoHighlight after a filter) pass `{ scroll: true }`.
9. **The popup Layer's `initialFocus` getter** re-runs `nav.highlight(current, { scroll: true })` to scroll the highlighted option into view once the list is shown, then returns `'none'`.

Red-team fixes (coordinator-directed):

10. **Names exist before hydration.** `aria-labelledby` is always `${id}-label`, written from the server render, instead of appearing once the label attachment ran. `label` is now a plain attribute part, and callers must render it. New option `labelledBy?: string | false`: a string names another element; `false` writes none, so the caller puts an `aria-label` on the element. The Combobox input is named by `<label for>`, and gets `aria-labelledby` only for a custom string.
11. **Multiple Select: Alt+ArrowUp only closes** (reason `'trigger'`). Choosing would toggle, and could deselect.
12. **IME.** The owner ignores keydown with `isComposing` or `keyCode === 229`. It also ignores any key in the same task as a `compositionend` on the input, because Safari sends the committing Enter after `compositionend`.
13. **Forms.** A new `name` option and a `formInputs` part:
    - `formInputs` is an ARRAY of hidden-input parts, one per selected value and none when nothing is selected. A single part cannot render several fields. Type `FormInput`.
    - The owning form's `reset` restores the starting value: `defaultValue`, or the controlled value at construction.
    - It runs one task after the event, because `reset` fires before the form resets its controls. For a Combobox, a silent `input` event first hands the reset text to `bind:value`, then `onValueChange` is called even when the value is unchanged, so the caller rewrites the text.
14. **Fixture.** Empty states sit outside the listbox, in a `role="status"` paragraph, because a listbox may only own options and groups. A form section adds an uncontrolled multiple Select, a Combobox and a Listbox, each with a name and a default.

Evidence:
- 7 unit tests (`tests/headless-listbox.test.ts`).
- After the red-team fixes: 21 Playwright specs in `tests/browser/headless/listbox.spec.ts`, 42/42 over 2 repeats. They include axe on the fixture with scripts blocked (SSR markup only) and with an open, empty combobox.
- `corepack pnpm check` reports 0/0, and `corepack pnpm test` 165/165.

Unproven:
- Group parts in a browser.
- `openOnFocus`.
- Firefox and Safari.

**Unit: Tooltip + groups (Tabs, Accordion, RadioGroup, ToggleGroup), branch `ref/hl-tooltip`.** No existing core file changed. Two new pure logic files (`logic/delay-group.ts`: the warm-up/skip-delay rule; `logic/selection.ts`: toggle rules for Accordion/ToggleGroup), unit-tested. The deviations are local and of different shapes, so no Phase E.

Tooltip:
1. **`aria-describedby` only while shown** (controller brief), not always (sketch). Trade-off for the owner: the description lands after the delay, so a screen reader may not announce it on the focus that opened it.
2. **Keyboard focus opens with the same delay as hover** (controller brief), not instantly (sketch). Only `:focus-visible` focus opens it, so the focus a mouse press gives the trigger never reopens a tooltip the press closed.
3. **The trigger part carries only `aria-describedby`**: no `id`, no `data-state` (both would collide with a Popover/Menu trigger part on the same element). Native anchoring needs an anchor id (`position.ts` keys `anchor-name` by id), so the attachment writes `<id>-trigger` onto a trigger that has no id at all, and removes it on detach. A shared trigger keeps the other part's id. *Superseded after merging the fixed core (853d54e):* trigger parts set no id anywhere, and native anchoring marks the anchor with a `data-ak-anchor` token, so the Tooltip writes no id at all; the spec asserts the trigger has no id and carries the token while natively anchored.
4. **Not a Layer.** The tooltip calls `startPositioning` itself on show and stops it on hide; placement is read once per show. Show/hide mirror the Layer's phase rule: `data-state` is written straight onto the element, close waits for exit animations (cap 400ms) unless reduced motion; a tooltip replaced by the next one hides without waiting.
5. **Options added:** `interactive` (default true: 100ms grace so the pointer can reach the content, WCAG 1.4.13; false closes on leave) and `longPress` (default false; true = 500ms or a number of ms; opens on a held touch, lingers 1.5s after release, suppresses the contextmenu). No `onOpenChange`; `open` and `side` are read-only. Content gets `data-instant` when it opened without delay (skip-delay), so CSS can skip the enter transition.
6. **Press = pointerdown or click** (keyboard activation); after a pointer press, hover cannot reopen it until the pointer leaves the trigger. Escape with only a pending (not yet visible) tooltip cancels it without consuming the key.

Groups:
7. **Selection that follows focus (automatic Tabs, RadioGroup) is done on KEY moves only**: the pattern's root has a capture-phase keydown that calls `nav.handleKey` itself and selects whatever got highlighted. `onHighlight` was not usable: ListNav also fires it on focusin, so tabbing into an unchecked radio group would check the first radio (APG says it must not). The handler only acts on keys whose target is one of the nav's own items.
8. **Focus leaving Tabs or a RadioGroup clears the ListNav highlight**, so the tab stop falls back to the selected tab / checked radio (APG). ToggleGroup keeps the toolbar behaviour (remembers the last focused item).
9. **Item parts lay readable ids over ListNav's item id** (`<id>-tab-<v>`, `-radio-`, `-toggle-`, `-trigger-`), which roving mode does not depend on. If the core settles a different rule for part ids on one element, these follow it.
10. **Accordion headers are ListNav items with the roving `tabindex` removed**: every header stays in the tab order (APG); arrows/Home/End are the optional extra. The open header of a single non-collapsible accordion gets `aria-disabled="true"` but stays focusable and navigable. `keyboardNav: false` makes `root` an empty part. Added `toggle(value)` and `expand(value)`. A closed `hidden="until-found"` panel still renders its own box (border, padding) under `content-visibility: hidden`, so styled panels put padding on an inner element.
11. **Tabs without a value select the first enabled tab once the list mounts** (client only; pass `defaultValue` for SSR). Tabs and panels carry `data-state="active|inactive"`.
12. **RadioGroup ignores Enter** (only Space and clicks check); items should not be buttons. ToggleGroup gained `role: 'group' | 'toolbar'` (toolbar adds `aria-orientation`), `isPressed()` and `toggle()`.

Red-team fixes (pattern review on `ref/headless`; no runtime file changed):

13. **Tabs keep a rendered selection.** The tablist attachment checks (a MutationObserver on the list plus an effect on the value, settled a microtask later) that the selected value is a rendered tab; if not (none given, or the selected tab left the `{#each}`/`{#if}`), it selects the first enabled tab through `onValueChange`, so its panel shows. `ValueState.onValueChange` carries no reason argument, so none is reported; adding one is a `runtime/parts.ts` change for the core owner.
14. **Accordion find-in-page cannot desync.** The browser removes `hidden` before firing `beforematch`. The handler expands the item unless it is disabled (disabled values are tracked from `trigger()`), then, if the item is still closed (disabled, or a controlled owner that refused the value), writes `hidden="until-found"` back, because Svelte's cached attribute would never restore it.
15. **RadioGroup in a form.** A form `reset` restores the value the group was created with (the controlled value at construction, or `defaultValue`). `formInput` changed from `<input type="hidden">` to a native **radio proxy** (checked while there is a value, `value`, `name`, `required`, `disabled`, `tabindex=-1`, `aria-hidden`): it posts exactly as a native radio group, and `required` really blocks submit with the browser's own message (a hidden input is barred from validation). Its attachment hides it visually with inline style (kit-owned element; it must stay rendered for the validation bubble) and re-syncs `checked` after a reset, which the browser applies after the `reset` event behind Svelte's cache. Consumers should also give it `sr-only` so the server-rendered radio never flashes.
16. **ToggleGroup `role: 'toolbar'` is toggles only** (JSDoc): arrow keys move between its toggle buttons only, any other control inside is a separate tab stop; a toolbar of mixed controls is built on `ListNav`.

Evidence for 13-16: four new specs in `groups.spec.ts` (selected tab removed; refused and disabled find-in-page reveal re-hidden; required blocks submit then posts; reset restores state and form data). `groups.spec.ts` + `tooltip.spec.ts` pass over `--repeat-each=2`.

Evidence:
- 11 `node --test` unit tests (`headless-tooltip`, `headless-groups`); the kit total is 158.
- 31 Playwright specs (`tooltip.spec.ts` 16 including positioning under both strategies, `groups.spec.ts` 15), 93/93 over 3 repeats; all of `tests/browser/headless` plus `a11y.spec.ts` passed 261/261.
- After merging the fixed core: 32 specs (one added for restored focus). `tests/browser/headless` passed 216/216 over 3 repeats, `a11y.spec.ts` 209/209, `corepack pnpm test` 158/158, check 0/0. The groups needed no change (their capture keydown already acts only on the nav's own items). Timing assertions now wait for a `toggle` stamped after the trigger event, because `toggle` is queued and can land after `:popover-open` matches.
- `corepack pnpm check` reports 0/0.

Unproven:
- Real find-in-page: Chromium's `window.find` matches text inside `hidden="until-found"` but neither fires `beforematch` nor reveals it, so the spec dispatches `beforematch` itself (what the find bar does).
- A real touch long-press (the spec dispatches synthetic touch PointerEvents).
- ~~After Escape closes a popover, the shared trigger's tooltip reopens on the returned focus.~~ Fixed after the core merge: the Tooltip's focus handler skips focus for which `isRestoringFocus(el)` (layers.svelte.ts) is true. A spec proves Escape-returned focus does not open the tooltip while a Tab arrival does.
- Firefox and Safari.

**Core fixes from the pattern red-team (coordinator-directed).** These change only runtime files, plus a regression spec and fixture case for each.

1. **The roving tab stop must name a rendered, navigable item.**
   - ListNav now keeps the set of rendered, navigable values from each revalidation (`#rendered`). `#latest` never forgets values, so it could not decide this.
   - Once measured, `highlighted` and `tabStop()` count only when they are in that set. Otherwise the stop is the first navigable item.
   - Before the first measurement (server render and hydration), the old order stays, so the markup matches.
   - Fixes: a RadioGroup whose value is gone, a removed selected tab, and a disabled checked radio. Any of these left every item at `tabindex=-1`.
   - Spec R2-1 covers a "gone" stop and a disabled stop.
2. **New internal `Layer.close(reason, options?: { restoreFocus?: boolean })`**, with the `CloseOptions` type in `runtime/layers.svelte.ts`. It closes the layer and the layers above it now, and the stack reports back through `notify(false, reason)` (`onOpenChange`).
   - Focus return follows the reason. `'focus-out'` never moves focus. `'outside'` moves it only if it is still inside the closing layer. Other reasons move it when it is inside the layer or on `<body>`.
   - `restoreFocus: false` suppresses focus return for any reason.
   - `LayerStack.close` takes the same options.
   - **Pattern authors:** to close because the person Tabbed or blurred away, call `layer.close('focus-out')`; do not write desired state. Writing desired state closes as `'api'` through the reconcile effect, which returns focus to the trigger. That is how Shift+Tab from an open Menu used to land past the menu button.
   - Documented on `ChangeReason` and `OpenState` in `parts.ts`.
   - Spec R2-2 uses a Layer-built, menu-like surface that closes on Tab: Shift+Tab lands on the trigger (the previous element), not on the element before it; Tab lands past the surface.

Evidence:
- `corepack pnpm check` reports 0/0, and `corepack pnpm test` passes 165/165.
- `tests/browser/headless` on `PW_PORT=5191` passes. Failures seen mid-run in the groups, menu and requestClose specs were Vite reloads from concurrent edits; on rerun they passed, the requestClose spec 15/15.

## Open questions and risks

- **Toasts during a modal.** Is a `popover="manual"` toast region shown after a modal `<dialog>` still inert? If it is, should the Toaster move its region into the topmost dialog while one is open, or should toasts stay non-interactive during modals? This needs a Playwright spike before Toaster is built.
- **Peer range.** Is `^5.29.0` acceptable, or should the floor be the lowest version the Playwright suite actually passes on? Attachments in component spreads had fixes after 5.29.
- **Native anchoring support.** Native anchoring is gated on `position-try-fallbacks`. Should Safari versions that support `anchor-name` but differ in fallback behaviour be forced onto the fallback? A showcase flag makes this testable.
- **Disabled menu items.** Should they be focusable (APG) or skipped (Radix and most kits)? The sketch skips them by default with a `disabledFocusable` option. Which default does the owner prefer?
- **Outside presses while a modal is open.** The backdrop is detected with the border-box rect test. Is that enough with `::backdrop` styling that includes margins on edge sheets, or should Sheet expose an inner content element?
- **Migration.** Should the existing hand-rolled components (GitHubPrActionBar disclosure, RiskToggle, BlockedWorkList) migrate in the same release or later? Their bespoke listeners will conflict with the stack's ordering until they do.

## Next implementation step

Write `logic/layer-chain.ts` and its `node --test` suite first. Then build `LayerStack` + `Layer` + `Dialog` and prove nested Escape, backdrop and focus return in one Playwright spec on a showcase page before any other pattern.
