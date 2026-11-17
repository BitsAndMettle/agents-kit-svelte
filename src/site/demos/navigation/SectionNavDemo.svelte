<script lang="ts">
	import { Card } from '$lib/primitives/display';
	import { SectionNav, type SectionNavItem } from '$lib/primitives/navigation';

	const ITEMS: SectionNavItem[] = [
		{ label: 'General', href: '?section=general' },
		{ label: 'Subscriptions', href: '?section=subscriptions' },
		{ label: 'Machines', href: '?section=machines' },
		{ label: 'Repositories', href: '?section=repositories' },
		{ label: 'Notifications', href: '?section=notifications' },
		{ label: 'Members', href: '?section=members' }
	];

	// These links stay on this page. An app passes the section its router has on screen.
	let current = $state('?section=subscriptions');

	function follow(event: MouseEvent): void {
		const link = (event.target as Element).closest('a');
		if (!link) return;
		event.preventDefault();
		current = link.getAttribute('href') ?? current;
	}

	let section = $derived(ITEMS.find((item) => item.href === current));
</script>

<!-- From md the sections are a column beside the page; on a phone they are a row above it that scrolls sideways. -->
<div class="mx-auto grid w-full max-w-3xl gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
	<SectionNav aria-label="Settings sections" items={ITEMS} {current} onclick={follow} />
	<Card title={section?.label} headingLevel={4}>
		<p class="m-0 text-[13px] text-fg-light">The {section?.label.toLowerCase()} settings go here.</p>
	</Card>
</div>
