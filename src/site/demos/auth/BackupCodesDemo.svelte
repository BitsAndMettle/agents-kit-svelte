<script lang="ts">
	import { BackupCodes } from '$lib/auth/account';

	const first = ['7k2m-9xqp', 'f3ab-81zd', 'q9wl-4tnc', 'x5rj-0vhe', 'm8dy-2gua', 'c1ps-6kbo', 'h4ne-7iwt', 'z0lq-3fxr'];
	let codes = $state(first);
	let log = $state('');

	/** A slow server call that returns a fresh set. */
	async function regenerate() {
		await new Promise((resolve) => setTimeout(resolve, 800));
		codes = ['b2vc-5hma', 'u7oe-1dzk', 'n6ti-8yxq', 'e3gr-9pjw', 'k0sa-4lfb', 'r8wx-2cnu', 'd5hy-7mop', 'j1qz-6vte'];
		log = 'Regenerated';
	}
</script>

<div class="flex max-w-xl flex-col gap-3">
	<BackupCodes
		{codes}
		used={[first[1], first[4]]}
		heading="Example app backup codes"
		filename="example-backup-codes.txt"
		onCopy={() => (log = 'Copied')}
		onDownload={() => (log = 'Downloaded')}
		onRegenerate={regenerate}
		requireAcknowledge
		onConfirm={() => (log = 'Continued')}
	/>
	<p class="m-0 text-[13px] text-fg-light">Last action: <span data-testid="codes-log">{log}</span></p>
</div>
