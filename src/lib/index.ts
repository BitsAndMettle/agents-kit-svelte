/**
 * Everything in one import. Each collection is also its own entry point
 * (`agents-kit-svelte/chat`, `/github`, `/skills`, ...), which keeps editor
 * auto-imports focused. Both tree-shake the same way.
 */

export * from './entries/chat';
export * from './entries/github';
export * from './entries/board';
export * from './entries/skills';
export * from './entries/workflows';
export * from './entries/generative';
export * from './entries/charts';
export * from './entries/data';
export * from './entries/effects';
export * from './entries/primitives';
export * from './entries/auth';
export * from './entries/settings';
export * from './entries/core';
