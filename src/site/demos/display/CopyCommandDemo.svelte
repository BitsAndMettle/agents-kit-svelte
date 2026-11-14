<script lang="ts">
	import { Card, CopyCommand } from '$lib/primitives/display';
</script>

<div class="mx-auto grid max-w-xl gap-4">
	<Card title="Connect a computer" description="Run this on the machine you want to connect." headingLevel={4}>
		<CopyCommand command="curl -fsSL https://example.com/install.sh | sh -s -- connect 7Q4M-2KXD" copyLabel="Copy the connect command" />
	</Card>
	<!-- In a narrow box the command wraps between its words, so all of it stays in view. -->
	<Card title="Add the server" headingLevel={4} class="max-w-xs">
		<CopyCommand command={'agent mcp add --transport http example https://example.com/mcp --header "Authorization: Bearer $EXAMPLE_TOKEN"'} copyLabel="Copy the server command" />
	</Card>
</div>
