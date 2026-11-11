<script lang="ts" module>
	/** Every word the banner shows or announces. */
	export interface VerifyEmailBannerLabels {
		title: string;
		/** The sentence about the unverified address. */
		message: (email: string) => string;
		resend: string;
		/** The visible line next to the Resend button while the wait runs. The button's own name stays `resend`. */
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
	import { tick } from 'svelte';
	import { Button } from '../../primitives/actions';
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
	const waitId = $props.id();
	let starting = false;
	let pending = $state(false);
	let outcome = $state<'sent' | 'failed' | null>(null);

	async function resend(): Promise<void> {
		// aria-disabled leaves the button focusable, so the click is guarded here.
		if (pending || starting || cooldown.active || !onResend) return;
		starting = true;
		outcome = null;
		// Let the cleared message reach the page first, so a failure that comes straight back is announced again.
		await tick();
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
			starting = false;
			pending = false;
		}
	}
</script>

<div {...rest} class={cn('w-full', className)}>
	<Alert tone="warning" title={text.title} description={text.message(email)} onDismiss={onDismiss ? () => onDismiss() : undefined} dismissLabel={text.dismiss}>
		{#snippet actions()}
			{#if onResend}
				<Button type="button" size="xs" variant="secondary" loading={pending} softDisabled={cooldown.active} aria-describedby={cooldown.active ? waitId : undefined} onclick={resend}>{text.resend}</Button>
				<!-- The name of the button stays put; the countdown is its own line, tied to the button, not live. -->
				{#if cooldown.active}<span id={waitId} class="text-xs text-fg-light">{text.resendIn(cooldown.remaining)}</span>{/if}
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
