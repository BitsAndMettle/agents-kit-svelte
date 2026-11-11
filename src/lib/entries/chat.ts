/** Conversation and coding-agent UI: messages, composer, activity, todos, tool approval and results, action receipts, diffs, code, terminal, context meter, checkpoints and the chat workbench. */

export { default as AISidebar } from '../agents/AISidebar.svelte';
export { default as AgentActivity } from '../agents/AgentActivity.svelte';
export { default as AgentDisclosure } from '../agents/AgentDisclosure.svelte';
export { default as AgentProgress } from '../agents/AgentProgress.svelte';
export { default as AgentWorkTrace } from '../agents/AgentWorkTrace.svelte';
export { default as ActionReceipt } from '../agents/ActionReceipt.svelte';
export { default as ApprovalCard } from '../agents/ApprovalCard.svelte';
export { default as Citations } from '../agents/Citations.svelte';
export { default as CodeBlock } from '../agents/CodeBlock.svelte';
export { default as FileDiff } from '../agents/FileDiff.svelte';
export { default as ImageGeneration } from '../agents/ImageGeneration.svelte';
export { default as Message } from '../agents/Message.svelte';
export { default as MessageBubble } from '../agents/MessageBubble.svelte';
export { default as MessageScroller } from '../agents/MessageScroller.svelte';
export { default as PresenceBanner } from '../agents/PresenceBanner.svelte';
export { default as PromptInput } from '../agents/PromptInput.svelte';
export { default as ReasoningText } from '../agents/ReasoningText.svelte';
export { default as StreamingResponse } from '../agents/StreamingResponse.svelte';
export { default as ThinkingShimmer } from '../agents/ThinkingShimmer.svelte';
export { default as TodoList } from '../agents/TodoList.svelte';
export { default as ToolApproval } from '../agents/ToolApproval.svelte';
export { default as ToolResult } from '../agents/ToolResult.svelte';
export { default as ChainOfThought } from '../ai-elements/ChainOfThought.svelte';
export { default as EnvironmentVariables } from '../ai-elements/EnvironmentVariables.svelte';
export { default as PackageInfo } from '../ai-elements/PackageInfo.svelte';
export { default as PlanCard } from '../ai-elements/PlanCard.svelte';
export { default as PromptSuggestions } from '../ai-elements/PromptSuggestions.svelte';
export { default as SchemaDisplay } from '../ai-elements/SchemaDisplay.svelte';
export { default as StackTrace } from '../ai-elements/StackTrace.svelte';
export { default as VoiceWaveVisualizer } from '../ai-elements/VoiceWaveVisualizer.svelte';
export { default as WebPreview } from '../ai-elements/WebPreview.svelte';
export { default as AgentCheckpoint } from '../runtime/AgentCheckpoint.svelte';
export { default as AgentContextMeter } from '../runtime/AgentContextMeter.svelte';
export { default as FileTree } from '../runtime/FileTree.svelte';
export { default as Terminal } from '../runtime/Terminal.svelte';
export { default as TestResults } from '../runtime/TestResults.svelte';
import ChatWorkbench from '../workbench/ChatWorkbench.svelte';
export { ChatWorkbench };
/**
 * @deprecated Renamed to `ChatWorkbench`. This alias will be removed in the next major release.
 */
export const TrailsideClaudeChat: typeof ChatWorkbench = ChatWorkbench;

export * from '../state/chat-helpers';
export * from '../agents/presence';
export * from '../core/agent';
export type * from '../types';

// Types declared in the components themselves.
export type { SidebarResourceKind, SidebarResource } from '../agents/AISidebar.svelte';
export type { ImageGenerationStatus } from '../agents/ImageGeneration.svelte';
export type { MessageBubbleVariant, MessageBubbleAlign } from '../agents/MessageBubble.svelte';
export type { RailItem } from '../agents/MessageScroller.svelte';
export type { ChainStepStatus, ChainOfThoughtStepItem } from '../ai-elements/ChainOfThought.svelte';
export type { EnvVariableEntry } from '../ai-elements/EnvironmentVariables.svelte';
export type { PackageChangeType, PackageDependencyItem, PackageScriptItem } from '../ai-elements/PackageInfo.svelte';
export type { PlanMilestone } from '../ai-elements/PlanCard.svelte';
export type { PromptSuggestionItem } from '../ai-elements/PromptSuggestions.svelte';
export type { HttpMethod, SchemaParameterItem, SchemaPropertyItem } from '../ai-elements/SchemaDisplay.svelte';
export type { StackFrameItem, ParsedStackTraceData } from '../ai-elements/StackTrace.svelte';
export type { VoiceSessionState, VoiceDeviceOption, VoicePersonaOption } from '../ai-elements/VoiceWaveVisualizer.svelte';
export type { PreviewViewport, PreviewConsoleLog } from '../ai-elements/WebPreview.svelte';
export type { WorktreeFileNode } from '../runtime/FileTree.svelte';
export type { SuiteTestItem, SuiteGroup } from '../runtime/TestResults.svelte';
