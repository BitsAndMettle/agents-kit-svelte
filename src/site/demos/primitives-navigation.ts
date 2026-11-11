import type { Component } from 'svelte';
import TabsDemo from './navigation/TabsDemo.svelte';
import AccordionDemo from './navigation/AccordionDemo.svelte';
import BreadcrumbDemo from './navigation/BreadcrumbDemo.svelte';
import PaginationDemo from './navigation/PaginationDemo.svelte';

/** Showcase demos for the Primitives collection (navigation), keyed by catalogue slug. Navigation and disclosure: Tabs, Accordion, Breadcrumb, Pagination. */
export const DEMOS_NAVIGATION: Record<string, Component> = {
	'tabs': TabsDemo,
	'accordion': AccordionDemo,
	'breadcrumb': BreadcrumbDemo,
	'pagination': PaginationDemo
};
