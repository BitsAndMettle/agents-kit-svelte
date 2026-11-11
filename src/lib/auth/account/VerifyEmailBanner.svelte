<script lang="ts" module>
	/** Every word the banner shows or announces. */
	export interface VerifyEmailBannerLabels {
		title: string;
		/** The sentence about the unverified address. */
		message: (email: string) => string;
		resend: string;
		/** Button text while the wait runs. */
		resendIn: (seconds: number) => string;
		/** Polite confirmation after a resend. */
		sent: string;
		/** Shown when the resend failed. */
		sendFailed: string;
		changeEmail: string;
		dismiss: string;
	}
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { isThenable } from './promise';
	import { cn } from '../../ui/cn';
	import { Alert } from '../../primitives/display';
	import { Button } from '../../primitives/actions';
	import type { TimeInput } from '../../core/time';
	import { Cooldown } from '../shared';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** The address that is not verified yet. */
		email: string;
		/** Choosing "Resend". Return a promise to show loading on the button; a rejection shows a failure message. */
		onResend?: () => unknown;
		/** When the next resend is allowed (from your server's response). The button waits until then. */
		resendAvailableAt?: TimeInput;
		/** Shows a dismiss button that calls this. The banner does not remove itself: stop rendering it. */
		onDismiss?: () => void;
		/** Shows a "Change email" button that calls this. */
		onChangeEmail?: () => void;
		/** Words, merged over the English defaults. */
		labels?: Partial<VerifyEmailBannerLabels>;
		/** Classes for the banner's outer box. */
		class?: string;
	}

	let { email, onResend, resendAvailableAt, onDismiss, onChangeEmail, labels, class: className = '', ...rest }: Props = $props();

	const text = $derived<VerifyEmailBannerLabels>({
		title: 'Verify your email address',
		message: (address) => `Your email ${address} is not verified.`,
		resend: 'Resend verification email',
		resendIn: (seconds) => `Resend in ${seconds}s`,
		sent: 'Sent',
		sendFailed: 'The email could not be sent. Try again.',
		changeEmail: 'Change email',
		dismiss: 'Dismiss',
		...labels
	});

	const cooldown = new Cooldown(() => resendAvailableAt);
	let pending = $state(false);
	let outcome = $state<'sent' | 'failed' | null>(null);

	async function resend(): Promise<void> {
		if (pending || cooldown.active) return;
		outcome = null;
		try {
			const result = onResend?.();
			if (isThenable(result)) {
				pending = true;
				await result;
			}
			outcome = 'sent';
		} catch {
			outcome = 'failed';
		} finally {
			pending = false;
		}
	}
</script>

<div {...rest} class={cn('w-full', className)}>
	<Alert tone="warning" title={text.title} description={text.message(email)} onDismiss={onDismiss ? () => onDismiss() : undefined} dismissLabel={text.dismiss}>
		{#snippet actions()}
			<Button size="xs" variant="secondary" loading={pending} disabled={cooldown.active} onclick={resend}>
				{cooldown.active ? text.resendIn(cooldown.remaining) : text.resend}
			</Button>
			{#if onChangeEmail}
				<button type="button" onclick={() => onChangeEmail()} class="rounded-sm text-[13px] font-medium text-fg-main underline underline-offset-2 hover:text-accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary/70">
					{text.changeEmail}
				</button>
			{/if}
			<span role="status" class="text-xs font-medium text-fg-main">{outcome === 'sent' ? text.sent : ''}</span>
			{#if outcome === 'failed'}<span role="alert" class="text-xs font-medium text-fg-main">{text.sendFailed}</span>{/if}
		{/snippet}
	</Alert>
</div>
