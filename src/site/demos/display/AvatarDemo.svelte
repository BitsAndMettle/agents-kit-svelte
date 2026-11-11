<script lang="ts">
	import { Avatar } from '$lib/primitives/display';
	import { Bot } from '@lucide/svelte';

	const broken = 'https://127.0.0.1:1/missing-avatar.png';
	const image =
		"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23c48a5a'/%3E%3Ccircle cx='20' cy='16' r='7' fill='%23f4e4d2'/%3E%3Cpath d='M6 40c2-10 10-13 14-13s12 3 14 13z' fill='%23f4e4d2'/%3E%3C/svg%3E";
</script>

<div class="flex flex-col gap-5">
	<div class="flex flex-wrap items-end gap-3">
		{#each ['xs', 'sm', 'md', 'lg', 'xl'] as const as size (size)}
			<Avatar name="Ada Lovelace" {size} />
		{/each}
	</div>
	<div class="flex flex-wrap items-center gap-3">
		<Avatar name="Grace Hopper" />
		<Avatar name="Linus Torvalds" shape="square" />
		<Avatar name="Margaret Hamilton" />
		<Avatar name="Broken image" src={broken} />
		<Avatar name="Photo" src={image} />
		<Avatar name="Build bot" alt="Build bot (automated)">{#snippet icon()}<Bot />{/snippet}</Avatar>
		<Avatar />
	</div>
	<div class="flex flex-wrap items-center gap-4">
		<Avatar name="Ada Lovelace" status="online" statusLabel="Online" size="lg" />
		<Avatar name="Grace Hopper" status="away" statusLabel="Away" size="lg" />
		<Avatar name="Linus Torvalds" status="busy" statusLabel="In a meeting" size="lg" />
		<span class="inline-flex items-center gap-2 text-sm"><Avatar name="Dana Scully" decorative size="sm" status="online" /> Dana Scully</span>
	</div>
</div>
