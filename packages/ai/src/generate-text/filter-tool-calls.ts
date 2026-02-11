import {
  LanguageModelV3Content,
  LanguageModelV3ToolChoice,
} from '@ai-sdk/provider';

/**
 * Filters tool calls based on toolChoice configuration to prevent infinite loops.
 *
 * When toolChoice forces a specific tool (e.g., { type: 'tool', toolName: 'specificTool' }),
 * some models may still return additional tool calls for other tools. If we process these
 * extra tool calls, the tool-result loop would continue indefinitely because:
 *
 * 1. Model returns tool calls for both 'specificTool' and 'extraTool'
 * 2. We execute both tools and send results back
 * 3. Model is still forced to call 'specificTool', so it calls it again
 * 4. Loop continues forever
 *
 * By filtering out tool calls that don't match the forced tool name, we ensure:
 * - Only the intended tool is executed
 * - The loop terminates when the stop condition is met
 * - The model's behavior aligns with the toolChoice constraint
 *
 * @param toolChoice - The tool choice configuration (auto, required, none, or specific tool)
 * @param toolName - The name of the tool call to check
 * @returns true if the tool call should be filtered out (ignored), false if it should be processed
 */
export function shouldFilterToolCall(
  toolChoice: LanguageModelV3ToolChoice | undefined,
  toolName: string,
): boolean {
  // Only filter when toolChoice forces a specific tool
  if (toolChoice?.type !== 'tool') {
    return false;
  }

  // Filter out (ignore) tool calls that don't match the forced tool name
  return toolName !== toolChoice.toolName;
}

/**
 * Filters content array to remove tool calls that don't match the forced toolChoice.
 *
 * This is used in non-streaming scenarios to filter the complete response content
 * before processing tool calls and creating step results.
 *
 * @param content - Array of content parts from the model response
 * @param toolChoice - The tool choice configuration
 * @returns Filtered content array with only matching tool calls
 */
export function filterContentToolCalls(
  content: Array<LanguageModelV3Content>,
  toolChoice: LanguageModelV3ToolChoice | undefined,
): Array<LanguageModelV3Content> {
  // If no specific tool is forced, return content as-is
  if (toolChoice?.type !== 'tool') {
    return content;
  }

  // Filter out tool-call parts that don't match the forced tool name
  return content.filter(
    part => part.type !== 'tool-call' || part.toolName === toolChoice.toolName,
  );
}
