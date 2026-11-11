import type { Component } from 'svelte';
import AccountMenuDemo from './auth/AccountMenuDemo.svelte';
import SessionListDemo from './auth/SessionListDemo.svelte';
import VerifyEmailBannerDemo from './auth/VerifyEmailBannerDemo.svelte';
import BackupCodesDemo from './auth/BackupCodesDemo.svelte';

/** Showcase demos for the Auth collection (account), keyed by catalogue slug. Account: AccountMenu, SessionList, VerifyEmailBanner, BackupCodes. */
export const DEMOS_AUTH_ACCOUNT: Record<string, Component> = {
	'account-menu': AccountMenuDemo,
	'session-list': SessionListDemo,
	'verify-email-banner': VerifyEmailBannerDemo,
	'backup-codes': BackupCodesDemo
};
