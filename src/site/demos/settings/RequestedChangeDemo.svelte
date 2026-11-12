<script lang="ts">
	import { RequestedChange, SettingsSection } from '$lib/settings/rows';
	import type { SettingsResult } from '$lib/settings/shared';

	/** Fixed times, so the server and the browser render the same text. */
	const NOW = Date.parse('2026-11-12T10:00:00Z');
	const minutesAgo = (m: number) => NOW - m * 60_000;

	let status = $state<'awaiting' | 'approved' | 'declined' | 'expired'>('awaiting');
	let resends = $state(0);
	let cancels = $state(0);
	let cancelled = $state(false);

	/** A fake server: answers after 600 ms. */
	const wait = () => new Promise((resolve) => setTimeout(resolve, 600));

	async function resend(): Promise<void | SettingsResult> {
		await wait();
		resends += 1;
	}

	async function cancel(): Promise<void | SettingsResult> {
		await wait();
		cancels += 1;
		cancelled = true;
	}

	async function refuse(): Promise<void | SettingsResult> {
		await wait();
		return { error: "Couldn't reach the approval service. The request is still waiting." };
	}
</script>

<div class="flex max-w-3xl flex-col gap-6">
	<SettingsSection data-testid="requested-device" title="Device limits" description="Changes to a device wait until someone at that device allows them.">
		{#if cancelled}
			<li class="px-4 py-3 text-[13px] text-fg-light" data-testid="requested-cancelled">Request withdrawn. Parallel runs stay at 2.</li>
		{:else}
			<RequestedChange
				data-testid="requested-awaiting"
				label="Parallel runs"
				description="How many jobs this device may run at once."
				effective="2"
				requested="3"
				waitingOn="the device owner"
				requestedAt={minutesAgo(12)}
				now={NOW}
				{status}
				onResend={resend}
				onCancelRequest={cancel}
			>
				{#snippet instructions()}
					<p class="m-0">On the device, run:</p>
					<code class="mt-1 block overflow-x-auto rounded-control bg-terminal-bg px-2 py-1.5 font-mono text-[12px] text-terminal-fg">example-cli allow 7Q4K</code>
				{/snippet}
			</RequestedChange>
		{/if}
		<RequestedChange data-testid="requested-approved" label="Storage limit" effective="200 GB" requested="200 GB" status="approved" requestedAt={minutesAgo(60 * 26)} now={NOW} />
		<RequestedChange data-testid="requested-declined" label="Night-time runs" effective="Off" requested="On" status="declined" waitingOn="your administrator" now={NOW} />
		<RequestedChange data-testid="requested-expired" label="Network access" effective="Team only" requested="Anyone" status="expired" now={NOW} />
	</SettingsSection>

	<SettingsSection data-testid="requested-admin" title="Your role" description="Role changes need an admin's approval.">
		<RequestedChange
			data-testid="requested-failing"
			label="Role"
			effective="Member"
			requested="Admin"
			waitingOn="an admin"
			requestedAt={minutesAgo(60 * 3)}
			now={NOW}
			status="awaiting"
			onResend={refuse}
			onCancelRequest={refuse}
		/>
		<RequestedChange
			data-testid="requested-nojs"
			label="Billing access"
			effective="None"
			requested="View invoices"
			waitingOn="the billing owner"
			requestedAt={minutesAgo(60 * 24 * 4)}
			now={NOW}
			status="awaiting"
			action="/settings-demo/requests"
			hidden={{ request: 'rq_4815' }}
		/>
	</SettingsSection>

	<div class="flex flex-wrap items-center gap-2 text-xs text-fg-light">
		<span>The app decides the outcome:</span>
		{#each ['awaiting', 'approved', 'declined', 'expired'] as const as next (next)}
			<button type="button" class="rounded-full border border-card-border px-2.5 py-1 text-fg-main hover:bg-canvas-secondary aria-pressed:bg-canvas-secondary" aria-pressed={status === next} onclick={() => (status = next)}>{next}</button>
		{/each}
		<span>Sent again <span data-testid="requested-resends">{resends}</span> times; cancelled <span data-testid="requested-cancels">{cancels}</span>.</span>
	</div>
</div>
