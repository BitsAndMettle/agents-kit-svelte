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
	import { LoaderCircle } from '@lucide/svelte';
	import { actionClass } from '../../primitives/actions/shared';
	import type { HTMLAttributes } from 'svelte/elements';
	import { isThenable } from './promise';
	import { cn } from '../../ui/cn';
	import { Alert } from '../../primitives/display';
	import type { TimeInput } from '../../core/time';
	import { Cooldown } from '../shared';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** The address that is not verified yet. */
		email: string;
		/** Choosing "Resend"; the button is hidden without it. Return a promise to show loading on the button; a rejection shows a failure message. */
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
		// aria-disabled leaves the button focusable, so the click is guarded here.
		if (pending || cooldown.active || !onResend) return;
		outcome = null;
		try {
			const result = onResend();
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
			{#if onResend}
				<!-- aria-disabled from markup (also on the server) keeps the button focusable during a wait; Button would drop it. -->
				<button type="button" onclick={resend} aria-disabled={pending || cooldown.active ? 'true' : undefined} aria-busy={pending || undefined} data-loading={pending || undefined} class={cn(actionClass('secondary', 'xs', false), pending && 'cursor-progress', cooldown.active && 'cursor-not-allowed opacity-60')}>
					<span class={cn('inline-flex items-center justify-center gap-[inherit]', pending && 'opacity-0')}>{cooldown.active ? text.resendIn(cooldown.remaining) : text.resend}</span>
					{#if pending}<span class="absolute inset-0 flex items-center justify-center" aria-hidden="true"><LoaderCircle class="animate-spin motion-reduce:animate-none" /></span>{/if}
				</button>
			{/if}
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
