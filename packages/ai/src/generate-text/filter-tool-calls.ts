import {
  LanguageModelV3Content,
  LanguageModelV3ToolChoice,
} from '@ai-sdk/provider';

/**
 * Checks if a specific tool is being forced by the toolChoice configuration.
 *
 * This helper centralizes the logic for determining when tool call filtering
 * should be active, reducing code duplication across the codebase.
 *
 * @param toolChoice - The tool choice configuration
 * @returns true if toolChoice forces a specific tool, false otherwise
 *
 * @internal
 */
function isSpecificToolForced(
  toolChoice: LanguageModelV3ToolChoice | undefined,
): toolChoice is { type: 'tool'; toolName: string } {
  return toolChoice?.type === 'tool';
}

/**
 * Filters tool calls based on toolChoice configuration to prevent infinite loops.
 *
 * ## Problem: Infinite Tool Call Loops
 *
 * When toolChoice forces a specific tool (e.g., `{ type: 'tool', toolName: 'weather' }`),
 * some language models may still return additional tool calls for other tools in their
 * response. If we process these extra tool calls, the tool-result loop would continue
 * indefinitely because:
 *
 * 1. **Model returns multiple tools**: Model returns tool calls for both 'weather' (forced)
 *    and 'calculator' (extra/unwanted)
 * 2. **We execute all tools**: Both tools are executed and their results are sent back
 * 3. **Model is still constrained**: Model is still forced to call 'weather', so it calls
 *    it again (along with potentially more extra tools)
 * 4. **Loop never terminates**: This cycle continues forever, never reaching a stop condition
 *
 * ## Solution: Filter Extra Tool Calls
 *
 * By filtering out tool calls that don't match the forced tool name, we ensure:
 * - **Only intended tool executes**: Only 'weather' tool is executed, ignoring 'calculator'
 * - **Loop can terminate**: The loop can reach its stop condition (e.g., maxSteps, stopWhen)
 * - **Behavior aligns with intent**: The model's behavior matches the toolChoice constraint
 *
 * ## When Filtering Occurs
 *
 * Filtering ONLY happens when:
 * - `toolChoice.type === 'tool'` (a specific tool is forced)
 * - The tool call name doesn't match `toolChoice.toolName`
 *
 * No filtering occurs for:
 * - `toolChoice.type === 'auto'` (model chooses freely)
 * - `toolChoice.type === 'required'` (model must call any tool)
 * - `toolChoice.type === 'none'` (no tools allowed)
 * - `toolChoice === undefined` (default behavior)
 *
 * @param toolChoice - The tool choice configuration (auto, required, none, or specific tool)
 * @param toolName - The name of the tool call to check
 * @returns true if the tool call should be filtered out (ignored), false if it should be processed
 *
 * @example
 * ```ts
 * // Forced tool scenario - filters out non-matching tools
 * shouldFilterToolCall({ type: 'tool', toolName: 'weather' }, 'calculator')
 * // => true (filter out 'calculator', only 'weather' allowed)
 *
 * shouldFilterToolCall({ type: 'tool', toolName: 'weather' }, 'weather')
 * // => false (don't filter 'weather', it matches)
 *
 * // Auto/required/none scenarios - no filtering
 * shouldFilterToolCall({ type: 'auto' }, 'anyTool')
 * // => false (no filtering, model chooses freely)
 * ```
 */
export function shouldFilterToolCall(
  toolChoice: LanguageModelV3ToolChoice | undefined,
  toolName: string,
): boolean {
  // Only filter when toolChoice forces a specific tool.
  // This check prevents extra tool calls from causing infinite loops.
  if (!isSpecificToolForced(toolChoice)) {
    return false;
  }

  // Filter out (ignore) tool calls that don't match the forced tool name.
  // This ensures only the intended tool is executed, allowing the loop to terminate.
  return toolName !== toolChoice.toolName;
}

/**
 * Filters content array to remove tool calls that don't match the forced toolChoice.
 *
 * This function is used in **non-streaming scenarios** to filter the complete response
 * content before processing tool calls and creating step results. It prevents the same
 * infinite loop issue as `shouldFilterToolCall`, but operates on the entire content
 * array at once rather than individual streaming chunks.
 *
 * ## How It Works
 *
 * The function preserves all non-tool-call content (text, reasoning, etc.) and only
 * filters tool-call parts that don't match the forced tool name. This ensures:
 * - Text and other content parts are always included
 * - Only matching tool calls are processed
 * - The response structure remains intact
 *
 * ## Usage Context
 *
 * This is called in `generate-text.ts` after receiving the complete model response
 * to filter `currentModelResponse.content` before creating the step result. This
 * prevents extra tool calls from being added to the response messages, which would
 * cause the model to continue calling tools indefinitely.
 *
 * @param content - Array of content parts from the model response
 * @param toolChoice - The tool choice configuration
 * @returns Filtered content array with only matching tool calls (all other content preserved)
 *
 * @example
 * ```ts
 * const content = [
 *   { type: 'text', text: 'I will check the weather' },
 *   { type: 'tool-call', toolName: 'weather', ... },
 *   { type: 'tool-call', toolName: 'calculator', ... }, // Extra tool call
 * ];
 *
 * const filtered = filterContentToolCalls(content, {
 *   type: 'tool',
 *   toolName: 'weather'
 * });
 *
 * // Result: Only 'weather' tool call is kept, 'calculator' is filtered out
 * // [
 * //   { type: 'text', text: 'I will check the weather' },
 * //   { type: 'tool-call', toolName: 'weather', ... },
 * // ]
 * ```
 */
export function filterContentToolCalls(
  content: Array<LanguageModelV3Content>,
  toolChoice: LanguageModelV3ToolChoice | undefined,
): Array<LanguageModelV3Content> {
  // If no specific tool is forced, return content as-is.
  // No filtering needed for auto/required/none/undefined toolChoice.
  if (!isSpecificToolForced(toolChoice)) {
    return content;
  }

  // Filter out tool-call parts that don't match the forced tool name.
  // Keep all other content types (text, reasoning, etc.) unchanged.
  // This prevents extra tool calls from causing infinite loops while preserving
  // the rest of the model's response.
  return content.filter(
    part => part.type !== 'tool-call' || part.toolName === toolChoice.toolName,
  );
}
