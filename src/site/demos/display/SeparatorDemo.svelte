<script lang="ts">
	import { Separator } from '$lib/primitives/display';
</script>

<div class="flex flex-col gap-4">
	<p class="text-sm">Above</p>
	<Separator />
	<p class="text-sm">Below</p>
	<Separator label="or" />
	<div class="flex h-6 items-center gap-3 text-sm">
		Docs <Separator orientation="vertical" /> Pricing <Separator orientation="vertical" /> Blog
	</div>
	<Separator decorative={false} aria-label="End of section" />
</div>
