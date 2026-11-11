import type { Component } from 'svelte';
import CheckboxDemo from './form/CheckboxDemo.svelte';
import FieldDemo from './form/FieldDemo.svelte';
import InputDemo from './form/InputDemo.svelte';
import NativeSelectDemo from './form/NativeSelectDemo.svelte';
import RadioGroupDemo from './form/RadioGroupDemo.svelte';
import SliderDemo from './form/SliderDemo.svelte';
import SwitchDemo from './form/SwitchDemo.svelte';
import TextareaDemo from './form/TextareaDemo.svelte';

/** Showcase demos for the Primitives collection (form), keyed by catalogue slug. Form controls: Field, Input, Textarea, Checkbox, Switch, RadioGroup, NativeSelect, Slider. */
export const DEMOS_FORM: Record<string, Component> = {
	'field': FieldDemo,
	'input': InputDemo,
	'textarea': TextareaDemo,
	'checkbox': CheckboxDemo,
	'switch': SwitchDemo,
	'radio-group': RadioGroupDemo,
	'native-select': NativeSelectDemo,
	'slider': SliderDemo
};
