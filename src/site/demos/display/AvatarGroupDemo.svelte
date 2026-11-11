<script lang="ts">
	import { AvatarGroup } from '$lib/primitives/display';

	const people = [
		{ name: 'Ada Lovelace' },
		{ name: 'Grace Hopper' },
		{ name: 'Linus Torvalds' },
		{ name: 'Margaret Hamilton' },
		{ name: 'Dana Scully' },
		{ name: 'Alan Turing' }
	];
</script>

<div class="flex flex-col gap-4">
	<AvatarGroup items={people} max={4} aria-label="Reviewers" />
	<AvatarGroup items={people.slice(0, 3)} size="lg" aria-label="Owners" />
	<AvatarGroup items={people} max={3} size="sm" shape="square" aria-label="Contributors" />
</div>
