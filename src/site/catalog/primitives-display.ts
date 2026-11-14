import type { CatalogItemMeta } from '../catalog-registry.ts';

const UPSTREAM = 'Agents Kit Svelte · Primitives';

/** Catalogue entries for the Primitives collection. Display: Badge, Avatar, AvatarGroup, Card, Separator, Kbd, Skeleton, Spinner, Progress, Alert, Notice, EmptyState. Category: 'Primitives'. */
export const PRIMITIVES_DISPLAY: CatalogItemMeta[] = [
	{
		slug: 'badge',
		name: 'Badge',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/display/Badge.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Small status chip in five tones and three looks (soft, solid, outline), with an optional dot or icon and two sizes.',
		usageSnippet: `<script lang="ts">
  import { Badge } from 'agents-kit-svelte/primitives';
</script>

<Badge tone="success" dot>Running</Badge>
<Badge tone="danger" variant="solid">Failed</Badge>
<Badge tone="accent" variant="outline" size="md">Draft</Badge>`
	},
	{
		slug: 'avatar',
		name: 'Avatar',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/display/Avatar.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Picture of a person or agent that falls back to initials (coloured from the name) or an icon when the image is missing or fails, with an optional presence dot that is spoken as text.',
		usageSnippet: `<script lang="ts">
  import { Avatar } from 'agents-kit-svelte/primitives';
</script>

<Avatar name="Ada Lovelace" src="/ada.png" size="lg" status="online" statusLabel="Online" />
<!-- The name is written out next to it, so the avatar itself stays silent. -->
<span class="flex items-center gap-2">
  <Avatar name="Grace Hopper" decorative size="sm" /> Grace Hopper
</span>`
	},
	{
		slug: 'avatar-group',
		name: 'AvatarGroup',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/display/AvatarGroup.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Overlapping avatars with a +N overflow count. It is a list for assistive technology, and the overflow names the people it hides.',
		usageSnippet: `<script lang="ts">
  import { AvatarGroup } from 'agents-kit-svelte/primitives';

  const people = [{ name: 'Ada Lovelace' }, { name: 'Grace Hopper' }, { name: 'Alan Turing' }];
</script>

<AvatarGroup items={people} max={2} aria-label="Reviewers" />`
	},
	{
		slug: 'card',
		name: 'Card',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/display/Card.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Surface with optional header (title, description, actions), body and footer. With href or onSelect the whole card is clickable through one title link or button, so it has a single tab stop.',
		usageSnippet: `<script lang="ts">
  import { Card } from 'agents-kit-svelte/primitives';
</script>

<Card title="Weekly report" description="Runs finished this week">
  Body content goes here.
  {#snippet footer()}Updated 2 hours ago{/snippet}
</Card>
<Card title="Open the board" href="/board">
  The whole card is the link, and <a href="/docs">links inside</a> still work.
</Card>`
	},
	{
		slug: 'separator',
		name: 'Separator',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/display/Separator.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Horizontal or vertical divider with an optional centred label. Decorative by default, or a real separator for assistive technology.',
		usageSnippet: `<script lang="ts">
  import { Separator } from 'agents-kit-svelte/primitives';
</script>

<Separator />
<Separator label="or" />
<div class="flex h-6 items-center gap-3">
  Docs <Separator orientation="vertical" /> Pricing
</div>`
	},
	{
		slug: 'kbd',
		name: 'Kbd',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/display/Kbd.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Key cap for shortcuts: one key, or a combination drawn as one kbd per key. Mod becomes ⌘ on Mac and Ctrl elsewhere.',
		usageSnippet: `<script lang="ts">
  import { Kbd } from 'agents-kit-svelte/primitives';
</script>

<p>Press <Kbd>Esc</Kbd> to close.</p>
<p>Search with <Kbd keys={['Ctrl', 'K']} />.</p>
<p>Platform aware: <Kbd keys={['Mod', 'K']} platform="auto" /></p>`
	},
	{
		slug: 'skeleton',
		name: 'Skeleton',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/display/Skeleton.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Shimmering placeholders (block, text lines, circle) that stand still for people who prefer reduced motion. Wrap them in a Skeleton with children to set aria-busy and read the loading state.',
		usageSnippet: `<script lang="ts">
  import { Skeleton } from 'agents-kit-svelte/primitives';
</script>

<Skeleton loadingLabel="Loading profile">
  <Skeleton shape="circle" width="2.5rem" />
  <Skeleton shape="line" lines={3} />
  <Skeleton height="6rem" />
</Skeleton>`
	},
	{
		slug: 'spinner',
		name: 'Spinner',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/display/Spinner.svelte',
		upstreamSource: UPSTREAM,
		description:
			'SVG spinner in four sizes that takes the surrounding text colour. It is an image with a label, announced through a live region only when you set announce, or silent when it sits inside a button that already says it is busy.',
		usageSnippet: `<script lang="ts">
  import { Spinner } from 'agents-kit-svelte/primitives';
</script>

<Spinner loadingLabel="Loading runs" announce />
<button disabled aria-busy="true">
  <Spinner size="sm" decorative /> Saving
</button>`
	},
	{
		slug: 'progress',
		name: 'Progress',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/display/Progress.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Progress bar, determinate or indeterminate, with tones, a visible label and value text. The value, range and text are exposed as a progressbar.',
		usageSnippet: `<script lang="ts">
  import { Progress } from 'agents-kit-svelte/primitives';

  let done = $state(7);
</script>

<Progress value={done} max={10} label="Tasks done" showValue valueText={(v) => v + ' of 10'} />
<Progress label="Waiting for the runner" />`
	},
	{
		slug: 'alert',
		name: 'Alert',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/display/Alert.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Inline callout in five tones with title, description, icon, actions and a dismiss button. It is announced only when you set live; otherwise it is a quiet block.',
		usageSnippet: `<script lang="ts">
  import { Alert } from 'agents-kit-svelte/primitives';

  let open = $state(true);
</script>

{#if open}
  <Alert tone="warning" title="Disk almost full" description="Free some space before the next run."
    live onDismiss={() => (open = false)} />
{/if}`
	},
	{
		slug: 'notice',
		name: 'Notice',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/display/Notice.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A warning the person can always dismiss: an Alert whose dismiss button is not optional and is named after the notice, so a list of them reads clearly. Return a promise from onDismiss and the notice waits for it, marked busy, and ignores a second press.',
		usageSnippet: `<script lang="ts">
  import { Notice } from 'agents-kit-svelte/primitives';

  let notices = $state([{ key: 'offline:build-box', title: 'Build box is offline', description: 'Nothing can run until it reconnects.' }]);

  // Store the dismissal, then stop rendering the notice. It waits, busy, until this settles.
  async function dismiss(key: string) {
    await fetch('/notices/dismiss', { method: 'POST', body: key });
    notices = notices.filter((notice) => notice.key !== key);
  }
</script>

{#each notices as notice (notice.key)}
  <Notice title={notice.title} description={notice.description} onDismiss={() => dismiss(notice.key)} />
{/each}`
	},
	{
		slug: 'empty-state',
		name: 'EmptyState',
		category: 'Primitives',
		sveltePath: 'src/lib/primitives/display/EmptyState.svelte',
		upstreamSource: UPSTREAM,
		description:
			'Placeholder for a list or page with nothing in it: icon, title, description and a primary and secondary action, in a compact or full size.',
		usageSnippet: `<script lang="ts">
  import { EmptyState } from 'agents-kit-svelte/primitives';
  import { Inbox } from '@lucide/svelte';
</script>

<EmptyState title="No runs yet" description="Start a run and it shows up here.">
  {#snippet icon()}<Inbox />{/snippet}
  {#snippet primaryAction()}<button type="button">Start a run</button>{/snippet}
</EmptyState>`
	}
];
