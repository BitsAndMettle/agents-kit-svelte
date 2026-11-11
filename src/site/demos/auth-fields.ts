import type { Component } from 'svelte';
import AuthCardDemo from './auth/AuthCardDemo.svelte';
import PasswordInputDemo from './auth/PasswordInputDemo.svelte';
import OtpInputDemo from './auth/OtpInputDemo.svelte';
import ProviderButtonDemo from './auth/ProviderButtonDemo.svelte';
import PasskeyButtonDemo from './auth/PasskeyButtonDemo.svelte';

/** Showcase demos for the Auth collection (fields), keyed by catalogue slug. Building blocks: AuthCard, PasswordInput, OtpInput, ProviderButton, PasskeyButton. */
export const DEMOS_AUTH_FIELDS: Record<string, Component> = {
	'auth-card': AuthCardDemo,
	'password-input': PasswordInputDemo,
	'otp-input': OtpInputDemo,
	'provider-button': ProviderButtonDemo,
	'passkey-button': PasskeyButtonDemo
};
