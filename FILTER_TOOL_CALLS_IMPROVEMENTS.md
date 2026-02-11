# Filter Tool Calls - Code Improvements

## Summary

Improved the tool call filtering code to reduce duplication and add comprehensive inline documentation explaining how it prevents infinite loops when `toolChoice` forces a specific tool.

## Changes Made

### 1. Reduced Code Duplication

**Added helper function `isSpecificToolForced()`:**
- Centralizes the check for `toolChoice?.type === 'tool'`
- Used by both `shouldFilterToolCall()` and `filterContentToolCalls()`
- Includes TypeScript type guard for better type safety
- Marked as `@internal` since it's only used within this module

**Before:**
```typescript
// Duplicated in two places
if (toolChoice?.type !== 'tool') {
  return false;
}
```

**After:**
```typescript
// Centralized helper with type guard
function isSpecificToolForced(
  toolChoice: LanguageModelV3ToolChoice | undefined,
): toolChoice is { type: 'tool'; toolName: string } {
  return toolChoice?.type === 'tool';
}

// Used consistently in both functions
if (!isSpecificToolForced(toolChoice)) {
  return false;
}
```

### 2. Enhanced Documentation

#### A. `shouldFilterToolCall()` Function

**Added comprehensive JSDoc with:**
- **Problem section**: Explains the infinite loop issue with numbered steps
- **Solution section**: Describes how filtering solves the problem
- **When Filtering Occurs section**: Lists all scenarios (when it does and doesn't filter)
- **Code examples**: Shows real-world usage with expected outputs

**Key improvements:**
- Uses concrete examples (weather/calculator tools) instead of abstract names
- Explains the "why" behind each step of the infinite loop
- Clarifies that filtering ONLY happens for forced tools
- Includes examples for all toolChoice types

#### B. `filterContentToolCalls()` Function

**Added comprehensive JSDoc with:**
- **How It Works section**: Explains content preservation behavior
- **Usage Context section**: Describes where and why it's called
- **Code example**: Shows before/after filtering with actual content structure

**Key improvements:**
- Emphasizes it's for non-streaming scenarios
- Explains that non-tool-call content is always preserved
- Shows the relationship to `generate-text.ts` usage
- Provides visual example of filtered output

### 3. Improved Inline Comments at Usage Sites

#### A. `generate-text.ts` (Line ~686)

**Before:**
```typescript
// Filter out extra tool calls when toolChoice forces a specific tool.
// See filter-tool-calls.ts for detailed explanation of why this prevents infinite loops.
```

**After:**
```typescript
// IMPORTANT: Filter out extra tool calls when toolChoice forces a specific tool.
// This prevents infinite loops where the model keeps calling the forced tool
// because we're also executing extra tools it returned. By only processing
// the forced tool, the loop can terminate when stop conditions are met.
// See filter-tool-calls.ts for detailed explanation.
```

#### B. `generate-text.ts` (Line ~816)

**Before:**
```typescript
// Filter response content to exclude extra tool calls when toolChoice forces a specific tool.
// See filter-tool-calls.ts for detailed explanation of why this prevents infinite loops.
```

**After:**
```typescript
// IMPORTANT: Filter response content to exclude extra tool calls when toolChoice
// forces a specific tool. This prevents infinite loops by ensuring only the forced
// tool's call is added to response messages. If we included extra tool calls, the
// model would keep calling the forced tool indefinitely because we'd be executing
// and returning results for tools it shouldn't have called.
// See filter-tool-calls.ts for detailed explanation.
```

#### C. `run-tools-transformation.ts` (Line ~215)

**Before:**
```typescript
// Filter tool-input streams when toolChoice forces a specific tool.
// See filter-tool-calls.ts for detailed explanation of why this prevents infinite loops.
```

**After:**
```typescript
// IMPORTANT: Filter tool-input streams when toolChoice forces a specific tool.
// When a tool is forced, we ignore streaming chunks for any other tools to prevent
// infinite loops. We track ignored tool call IDs to filter their delta/end chunks too.
// See filter-tool-calls.ts for detailed explanation of the infinite loop problem.
```

#### D. `run-tools-transformation.ts` (Line ~278)

**Before:**
```typescript
// Filter out extra tool calls when toolChoice forces a specific tool.
// See filter-tool-calls.ts for detailed explanation of why this prevents infinite loops.
```

**After:**
```typescript
// IMPORTANT: Filter out extra tool calls when toolChoice forces a specific tool.
// This prevents infinite loops in streaming mode by ensuring only the forced tool
// is executed. If we processed extra tools, the model would keep calling the forced
// tool indefinitely because we'd be sending back results for unintended tools.
// See filter-tool-calls.ts for detailed explanation.
```

## Benefits

1. **Reduced Duplication**: The `isSpecificToolForced()` helper eliminates repeated conditional logic
2. **Better Type Safety**: Type guard provides stronger TypeScript guarantees
3. **Clearer Intent**: Inline comments now explain the "why" at each usage site
4. **Easier Maintenance**: Centralized logic means changes only need to happen in one place
5. **Better Onboarding**: New developers can understand the infinite loop problem without deep diving
6. **Consistent Messaging**: All usage sites now have similar explanatory comments

## Files Modified

1. `/vercel/sandbox/packages/ai/src/generate-text/filter-tool-calls.ts`
2. `/vercel/sandbox/packages/ai/src/generate-text/generate-text.ts`
3. `/vercel/sandbox/packages/ai/src/generate-text/run-tools-transformation.ts`

## Testing

The existing test suite in `filter-tool-calls.test.ts` covers all scenarios and should continue to pass without modification, as the behavior remains unchanged - only documentation and code organization improved.
