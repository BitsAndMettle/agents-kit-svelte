import type { Component } from 'svelte';
import ForgotPasswordCardDemo from './auth/ForgotPasswordCardDemo.svelte';
import ResetPasswordCardDemo from './auth/ResetPasswordCardDemo.svelte';
import TwoFactorSetupDemo from './auth/TwoFactorSetupDemo.svelte';

/** Showcase demos for the Auth collection (recovery), keyed by catalogue slug. Recovery and setup: ForgotPasswordCard, ResetPasswordCard, TwoFactorSetup. */
export const DEMOS_AUTH_RECOVERY: Record<string, Component> = {
	'forgot-password-card': ForgotPasswordCardDemo,
	'reset-password-card': ResetPasswordCardDemo,
	'two-factor-setup': TwoFactorSetupDemo
};
