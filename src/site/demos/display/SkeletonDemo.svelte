<script lang="ts">
	import { Skeleton } from '$lib/primitives/display';
</script>

<div class="flex max-w-sm flex-col gap-4">
	<Skeleton label="Loading profile" class="rounded-card border border-card-border bg-card-bg p-4">
		<div class="flex items-center gap-3">
			<Skeleton shape="circle" width="2.5rem" />
			<div class="flex flex-1 flex-col gap-2">
				<Skeleton shape="line" width="50%" />
				<Skeleton shape="line" width="30%" />
			</div>
		</div>
		<Skeleton shape="line" lines={3} />
		<Skeleton height="6rem" />
	</Skeleton>
</div>
