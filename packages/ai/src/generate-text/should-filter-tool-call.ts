import { LanguageModelV3ToolChoice } from '@ai-sdk/provider';

/**
 * Determines whether a tool call should be filtered out based on the toolChoice setting.
 *
 * When toolChoice forces a specific tool (type: 'tool'), we need to filter out any extra
 * tool calls that the model may have returned for different tools. This prevents infinite
 * loops in multi-step scenarios where:
 * 1. The model returns multiple tool calls despite toolChoice forcing a single tool
 * 2. We execute the extra tool calls and add their results to messages
 * 3. The next step still has toolChoice forcing the same tool
 * 4. The model continues to call both tools, creating an infinite loop
 *
 * By filtering out extra tool calls early, we ensure that only the forced tool is executed
 * and added to the conversation, allowing the multi-step process to progress naturally.
 *
 * @param toolChoice - The tool choice setting that may force a specific tool
 * @param toolName - The name of the tool call to check
 * @returns true if the tool call should be filtered out (skipped), false otherwise
 *
 * @example
 * ```ts
 * // When toolChoice forces 'weather' tool
 * shouldFilterToolCall(
 *   { type: 'tool', toolName: 'weather' },
 *   'weather'
 * ) // returns false - don't filter, this is the forced tool
 *
 * shouldFilterToolCall(
 *   { type: 'tool', toolName: 'weather' },
 *   'time'
 * ) // returns true - filter this out, it's not the forced tool
 *
 * // When toolChoice is auto or required
 * shouldFilterToolCall(
 *   { type: 'auto' },
 *   'anyTool'
 * ) // returns false - don't filter, no forced tool
 * ```
 */
export function shouldFilterToolCall(
  toolChoice: LanguageModelV3ToolChoice | undefined,
  toolName: string,
): boolean {
  // Only filter when toolChoice forces a specific tool
  if (toolChoice?.type !== 'tool') {
    return false;
  }

  // Filter out (return true) if the tool name doesn't match the forced tool
  return toolName !== toolChoice.toolName;
}
