<script lang="ts">
	import { Button, ButtonGroup } from '../../../lib/primitives/actions';
</script>

<div class="flex flex-wrap items-start gap-6">
	<ButtonGroup aria-label="Run controls">
		<Button>Pause</Button>
		<Button>Retry</Button>
		<Button variant="danger">Stop</Button>
	</ButtonGroup>
	<ButtonGroup aria-label="Stacked actions" orientation="vertical">
		<Button>Approve</Button>
		<Button>Request changes</Button>
		<Button>Reject</Button>
	</ButtonGroup>
	<ButtonGroup aria-label="Spaced actions" attached={false}>
		<Button variant="ghost">Cancel</Button>
		<Button variant="primary">Save</Button>
	</ButtonGroup>
</div>
