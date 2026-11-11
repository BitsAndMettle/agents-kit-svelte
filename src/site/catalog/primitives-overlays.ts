import type { CatalogItemMeta } from '../catalog-registry.ts';

const UPSTREAM = 'Agents Kit Svelte · Primitives';

/** Catalogue entries for the Primitives collection. Overlays: Dialog, AlertDialog, Sheet, Popover, Tooltip. Category: 'Primitives'. */
export const PRIMITIVES_OVERLAYS: CatalogItemMeta[] = [
	{
		slug: 'dialog',
		name: 'Dialog',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/overlays/Dialog.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Modal dialog on a native <dialog>: title and description wired for screen readers, focus trapped inside and returned to the trigger, Escape, backdrop press and a close button to dismiss. The body scrolls between a fixed header and footer; sizes sm, md, lg, and full (fills a phone screen). bind:open or defaultOpen, onOpenChange, initialFocus, bind:ref.',
		usageSnippet: `<script lang="ts">
  import { Dialog, buttonClass, INPUT_CLASS } from 'agents-kit-svelte/primitives';

  let open = $state(false);
  let name = $state('Release notes agent');
</script>

<Dialog bind:open title="Edit agent" description="The name shows on the Board.">
  {#snippet trigger(t)}
    <button {...t} class={buttonClass('secondary', 'md')}>Edit agent</button>
  {/snippet}
  <label class="grid gap-1 text-xs">Name <input class={INPUT_CLASS} bind:value={name} /></label>
  {#snippet footer(close)}
    <button type="button" class={buttonClass('ghost', 'md')} onclick={close}>Cancel</button>
    <button type="button" class={buttonClass('primary', 'md')} onclick={close}>Save</button>
  {/snippet}
</Dialog>`
	},
	{
		slug: 'alert-dialog',
		name: 'AlertDialog',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/overlays/AlertDialog.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Confirmation with role="alertdialog": a backdrop press does nothing, Escape cancels, and focus starts on the safe Cancel action. tone (UiTone): "danger" for destructive actions. When onConfirm returns a Promise, the confirm button shows a loading state and the dialog stays open until it resolves; a rejection keeps it open and shows the error.',
		usageSnippet: `<script lang="ts">
  import { AlertDialog, buttonClass } from 'agents-kit-svelte/primitives';

  async function deleteRun() {
    const response = await fetch('/api/runs/482', { method: 'DELETE' });
    if (!response.ok) throw new Error('The run could not be deleted.');
  }
</script>

<AlertDialog
  title="Delete run 482?"
  description="This removes the run and its logs. It cannot be undone."
  confirmLabel="Delete run"
  pendingLabel="Deleting…"
  tone="danger"
  onConfirm={deleteRun}
>
  {#snippet trigger(t)}
    <button {...t} class={buttonClass('danger', 'md')}>Delete run</button>
  {/snippet}
</AlertDialog>`
	},
	{
		slug: 'sheet',
		name: 'Sheet',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/overlays/Sheet.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Modal panel that slides in from an edge (right, left, bottom or top): full height on the sides, full width on the top and bottom, clear of phone safe-area insets. Same behaviour as Dialog (focus trap, Escape, backdrop press, focus return); bottom sheets show a drag handle.',
		usageSnippet: `<script lang="ts">
  import { Sheet, buttonClass } from 'agents-kit-svelte/primitives';

  let open = $state(false);
</script>

<Sheet bind:open side="right" title="Filter runs" description="Show only the runs you need.">
  {#snippet trigger(t)}
    <button {...t} class={buttonClass('secondary', 'md')}>Filters</button>
  {/snippet}
  <label class="flex items-center gap-2"><input type="checkbox" /> Waiting on a person</label>
  {#snippet footer(close)}
    <button type="button" class={buttonClass('primary', 'md')} onclick={close}>Apply</button>
  {/snippet}
</Sheet>`
	},
	{
		slug: 'popover',
		name: 'Popover',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/overlays/Popover.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Non-modal floating card anchored to its trigger in the top layer: flips to stay in view, closes on Escape, an outside press or when focus leaves it. Optional arrow that follows the side it lands on and keeps pointing at the trigger when the card shifts to stay in view, placement shorthand ("top-start"), and matchWidth for a surface as wide as its trigger. Inside a Dialog, Escape closes the popover first.',
		usageSnippet: `<script lang="ts">
  import { Popover, buttonClass } from 'agents-kit-svelte/primitives';

  let open = $state(false);
</script>

<Popover bind:open arrow placement="top" title="Run 482" description="Started 4 minutes ago.">
  {#snippet trigger(t)}
    <button {...t} class={buttonClass('secondary', 'md')}>Run details</button>
  {/snippet}
  <p class="text-xs">Branch feat/overlays, step 14 of 20.</p>
</Popover>`
	},
	{
		slug: 'tooltip',
		name: 'Tooltip',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/overlays/Tooltip.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Short description on hover and keyboard focus: opens after a delay (at once while another tooltip was just shown), never takes focus, closes first on Escape and never closes an open popover. Works on any focusable element through the trigger snippet. Disabled buttons get no hover or focus, so wrap one in <span tabindex="0"> and put the tooltip on the span.',
		usageSnippet: `<script lang="ts">
  import { Copy } from '@lucide/svelte';
  import { Tooltip, buttonClass } from 'agents-kit-svelte/primitives';
</script>

<Tooltip content="Copy output" placement="top">
  {#snippet trigger(t)}
    <button {...t} type="button" aria-label="Copy output" class={buttonClass('ghost', 'icon')}>
      <Copy aria-hidden="true" />
    </button>
  {/snippet}
</Tooltip>`
	}
];
