import type { Component } from 'svelte';
import BadgeDemo from './display/BadgeDemo.svelte';
import AvatarDemo from './display/AvatarDemo.svelte';
import AvatarGroupDemo from './display/AvatarGroupDemo.svelte';
import CardDemo from './display/CardDemo.svelte';
import SeparatorDemo from './display/SeparatorDemo.svelte';
import KbdDemo from './display/KbdDemo.svelte';
import SkeletonDemo from './display/SkeletonDemo.svelte';
import SpinnerDemo from './display/SpinnerDemo.svelte';
import ProgressDemo from './display/ProgressDemo.svelte';
import AlertDemo from './display/AlertDemo.svelte';
import NoticeDemo from './display/NoticeDemo.svelte';
import EmptyStateDemo from './display/EmptyStateDemo.svelte';
import ListRowDemo from './display/ListRowDemo.svelte';
import CopyCommandDemo from './display/CopyCommandDemo.svelte';

/** Showcase demos for the Primitives collection (display), keyed by catalogue slug. Display: Badge, Avatar, AvatarGroup, Card, Separator, Kbd, Skeleton, Spinner, Progress, Alert, Notice, EmptyState, ListRow, CopyCommand. */
export const DEMOS_DISPLAY: Record<string, Component> = {
	'badge': BadgeDemo,
	'avatar': AvatarDemo,
	'avatar-group': AvatarGroupDemo,
	'card': CardDemo,
	'separator': SeparatorDemo,
	'kbd': KbdDemo,
	'skeleton': SkeletonDemo,
	'spinner': SpinnerDemo,
	'progress': ProgressDemo,
	'alert': AlertDemo,
	'notice': NoticeDemo,
	'empty-state': EmptyStateDemo,
	'list-row': ListRowDemo,
	'copy-command': CopyCommandDemo
};
