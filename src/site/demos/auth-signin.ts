import type { Component } from 'svelte';
import SignInCardDemo from './auth/SignInCardDemo.svelte';
import SignUpCardDemo from './auth/SignUpCardDemo.svelte';
import MagicLinkSentDemo from './auth/MagicLinkSentDemo.svelte';
import TwoFactorCardDemo from './auth/TwoFactorCardDemo.svelte';

/** Showcase demos for the Auth collection (signin), keyed by catalogue slug. Sign-in flows: SignInCard, SignUpCard, MagicLinkSent, TwoFactorCard. */
export const DEMOS_AUTH_SIGNIN: Record<string, Component> = {
	'sign-in-card': SignInCardDemo,
	'sign-up-card': SignUpCardDemo,
	'magic-link-sent': MagicLinkSentDemo,
	'two-factor-card': TwoFactorCardDemo
};
