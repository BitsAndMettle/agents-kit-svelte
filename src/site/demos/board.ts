import type { Component } from 'svelte';
import StatusStripDemo from './board/StatusStripDemo.svelte';
import BoardLanesDemo from './board/BoardLanesDemo.svelte';
import CardFaceDemo from './board/CardFaceDemo.svelte';

/** Showcase demos for the Board collection, keyed by catalogue slug: StatusStrip, BoardLanes, CardFace. */
export const DEMOS_BOARD: Record<string, Component> = {
	'status-strip': StatusStripDemo,
	'board-lanes': BoardLanesDemo,
	'card-face': CardFaceDemo
};
