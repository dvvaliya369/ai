import {
  LanguageModelV3StreamPart,
  LanguageModelV3Usage,
} from '@ai-sdk/provider';
import { delay, tool } from '@ai-sdk/provider-utils';
import {
  convertArrayToReadableStream,
  convertReadableStreamToArray,
  mockId,
} from '@ai-sdk/provider-utils/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod/v4';
import { NoSuchToolError } from '../error/no-such-tool-error';
import { MockTracer } from '../test/mock-tracer';
import { runToolsTransformation } from './run-tools-transformation';

const testUsage: LanguageModelV3Usage = {
  inputTokens: {
    total: 3,
    noCache: 3,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: {
    total: 10,
    text: 10,
    reasoning: undefined,
  },
};

describe('runToolsTransformation', () => {
  it('should forward text parts', async () => {
    const inputStream: ReadableStream<LanguageModelV3StreamPart> =
      convertArrayToReadableStream([
        { type: 'text-start', id: '1' },
        { type: 'text-delta', id: '1', delta: 'text' },
        { type: 'text-end', id: '1' },
        {
          type: 'finish',
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: testUsage,
        },
      ]);

    const transformedStream = runToolsTransformation({
      generateId: mockId({ prefix: 'id' }),
      tools: undefined,
      generatorStream: inputStream,
      toolChoice: undefined,
      tracer: new MockTracer(),
      telemetry: undefined,
      messages: [],
      system: undefined,
      abortSignal: undefined,
      repairToolCall: undefined,
      experimental_context: undefined,
    });

    const result = await convertReadableStreamToArray(transformedStream);

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "type": "text-start",
        },
        {
          "delta": "text",
          "id": "1",
          "type": "text-delta",
        },
        {
          "id": "1",
          "type": "text-end",
        },
        {
          "finishReason": "stop",
          "providerMetadata": undefined,
          "rawFinishReason": "stop",
          "type": "finish",
          "usage": {
            "cachedInputTokens": undefined,
            "inputTokenDetails": {
              "cacheReadTokens": undefined,
              "cacheWriteTokens": undefined,
              "noCacheTokens": 3,
            },
            "inputTokens": 3,
            "outputTokenDetails": {
              "reasoningTokens": undefined,
              "textTokens": 10,
            },
            "outputTokens": 10,
            "raw": undefined,
            "reasoningTokens": undefined,
            "totalTokens": 13,
          },
        },
      ]
    `);
  });

  it('should handle async tool execution', async () => {
    const inputStream: ReadableStream<LanguageModelV3StreamPart> =
      convertArrayToReadableStream([
        {
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'syncTool',
          input: `{ "value": "test" }`,
        },
        {
          type: 'finish',
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: testUsage,
        },
      ]);

    const transformedStream = runToolsTransformation({
      generateId: mockId({ prefix: 'id' }),
      tools: {
        syncTool: {
          title: 'Sync Tool',
          inputSchema: z.object({ value: z.string() }),
          execute: async ({ value }) => `${value}-sync-result`,
        },
      },
      generatorStream: inputStream,
      toolChoice: undefined,
      tracer: new MockTracer(),
      telemetry: undefined,
      messages: [],
      system: undefined,
      abortSignal: undefined,
      repairToolCall: undefined,
      experimental_context: undefined,
    });

    expect(await convertReadableStreamToArray(transformedStream))
      .toMatchInlineSnapshot(`
        [
          {
            "input": {
              "value": "test",
            },
            "providerExecuted": undefined,
            "providerMetadata": undefined,
            "title": "Sync Tool",
            "toolCallId": "call-1",
            "toolName": "syncTool",
            "type": "tool-call",
          },
          {
            "dynamic": false,
            "input": {
              "value": "test",
            },
            "output": "test-sync-result",
            "toolCallId": "call-1",
            "toolName": "syncTool",
            "type": "tool-result",
          },
          {
            "finishReason": "stop",
            "providerMetadata": undefined,
            "rawFinishReason": "stop",
            "type": "finish",
            "usage": {
              "cachedInputTokens": undefined,
              "inputTokenDetails": {
                "cacheReadTokens": undefined,
                "cacheWriteTokens": undefined,
                "noCacheTokens": 3,
              },
              "inputTokens": 3,
              "outputTokenDetails": {
                "reasoningTokens": undefined,
                "textTokens": 10,
              },
              "outputTokens": 10,
              "raw": undefined,
              "reasoningTokens": undefined,
              "totalTokens": 13,
            },
          },
        ]
      `);
  });

  it('should handle sync tool execution', async () => {
    const inputStream: ReadableStream<LanguageModelV3StreamPart> =
      convertArrayToReadableStream([
        {
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'syncTool',
          input: `{ "value": "test" }`,
        },
        {
          type: 'finish',
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: testUsage,
        },
      ]);

    const transformedStream = runToolsTransformation({
      generateId: mockId({ prefix: 'id' }),
      tools: {
        syncTool: {
          title: 'Sync Tool',
          inputSchema: z.object({ value: z.string() }),
          execute: ({ value }) => `${value}-sync-result`,
        },
      },
      generatorStream: inputStream,
      toolChoice: undefined,
      tracer: new MockTracer(),
      telemetry: undefined,
      messages: [],
      system: undefined,
      abortSignal: undefined,
      repairToolCall: undefined,
      experimental_context: undefined,
    });

    expect(await convertReadableStreamToArray(transformedStream))
      .toMatchInlineSnapshot(`
        [
          {
            "input": {
              "value": "test",
            },
            "providerExecuted": undefined,
            "providerMetadata": undefined,
            "title": "Sync Tool",
            "toolCallId": "call-1",
            "toolName": "syncTool",
            "type": "tool-call",
          },
          {
            "dynamic": false,
            "input": {
              "value": "test",
            },
            "output": "test-sync-result",
            "toolCallId": "call-1",
            "toolName": "syncTool",
            "type": "tool-result",
          },
          {
            "finishReason": "stop",
            "providerMetadata": undefined,
            "rawFinishReason": "stop",
            "type": "finish",
            "usage": {
              "cachedInputTokens": undefined,
              "inputTokenDetails": {
                "cacheReadTokens": undefined,
                "cacheWriteTokens": undefined,
                "noCacheTokens": 3,
              },
              "inputTokens": 3,
              "outputTokenDetails": {
                "reasoningTokens": undefined,
                "textTokens": 10,
              },
              "outputTokens": 10,
              "raw": undefined,
              "reasoningTokens": undefined,
              "totalTokens": 13,
            },
          },
        ]
      `);
  });

  it('should hold off on sending finish until the delayed tool result is received', async () => {
    const inputStream: ReadableStream<LanguageModelV3StreamPart> =
      convertArrayToReadableStream([
        {
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'delayedTool',
          input: `{ "value": "test" }`,
        },
        {
          type: 'finish',
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: testUsage,
        },
      ]);

    const transformedStream = runToolsTransformation({
      generateId: mockId({ prefix: 'id' }),
      tools: {
        delayedTool: {
          title: 'Delayed Tool',
          inputSchema: z.object({ value: z.string() }),
          execute: async ({ value }) => {
            await delay(0); // Simulate delayed execution
            return `${value}-delayed-result`;
          },
        },
      },
      generatorStream: inputStream,
      toolChoice: undefined,
      tracer: new MockTracer(),
      telemetry: undefined,
      messages: [],
      system: undefined,
      abortSignal: undefined,
      repairToolCall: undefined,
      experimental_context: undefined,
    });

    const result = await convertReadableStreamToArray(transformedStream);

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "input": {
            "value": "test",
          },
          "providerExecuted": undefined,
          "providerMetadata": undefined,
          "title": "Delayed Tool",
          "toolCallId": "call-1",
          "toolName": "delayedTool",
          "type": "tool-call",
        },
        {
          "dynamic": false,
          "input": {
            "value": "test",
          },
          "output": "test-delayed-result",
          "toolCallId": "call-1",
          "toolName": "delayedTool",
          "type": "tool-result",
        },
        {
          "finishReason": "stop",
          "providerMetadata": undefined,
          "rawFinishReason": "stop",
          "type": "finish",
          "usage": {
            "cachedInputTokens": undefined,
            "inputTokenDetails": {
              "cacheReadTokens": undefined,
              "cacheWriteTokens": undefined,
              "noCacheTokens": 3,
            },
            "inputTokens": 3,
            "outputTokenDetails": {
              "reasoningTokens": undefined,
              "textTokens": 10,
            },
            "outputTokens": 10,
            "raw": undefined,
            "reasoningTokens": undefined,
            "totalTokens": 13,
          },
        },
      ]
    `);
  });

  it('should try to repair tool call when the tool name is not found', async () => {
    const inputStream: ReadableStream<LanguageModelV3StreamPart> =
      convertArrayToReadableStream([
        {
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'unknownTool',
          input: `{ "value": "test" }`,
        },
        {
          type: 'finish',
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: testUsage,
        },
      ]);

    const transformedStream = runToolsTransformation({
      generateId: mockId({ prefix: 'id' }),
      generatorStream: inputStream,
      toolChoice: undefined,
      tracer: new MockTracer(),
      telemetry: undefined,
      messages: [],
      system: undefined,
      abortSignal: undefined,
      tools: {
        correctTool: {
          inputSchema: z.object({ value: z.string() }),
          execute: async ({ value }) => `${value}-result`,
        },
      },
      repairToolCall: async ({ toolCall, tools, inputSchema, error }) => {
        expect(NoSuchToolError.isInstance(error)).toBe(true);
        expect(toolCall).toStrictEqual({
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'unknownTool',
          input: `{ "value": "test" }`,
        });

        return { ...toolCall, toolName: 'correctTool' };
      },
      experimental_context: undefined,
    });

    expect(await convertReadableStreamToArray(transformedStream))
      .toMatchInlineSnapshot(`
        [
          {
            "input": {
              "value": "test",
            },
            "providerExecuted": undefined,
            "providerMetadata": undefined,
            "title": undefined,
            "toolCallId": "call-1",
            "toolName": "correctTool",
            "type": "tool-call",
          },
          {
            "dynamic": false,
            "input": {
              "value": "test",
            },
            "output": "test-result",
            "toolCallId": "call-1",
            "toolName": "correctTool",
            "type": "tool-result",
          },
          {
            "finishReason": "stop",
            "providerMetadata": undefined,
            "rawFinishReason": "stop",
            "type": "finish",
            "usage": {
              "cachedInputTokens": undefined,
              "inputTokenDetails": {
                "cacheReadTokens": undefined,
                "cacheWriteTokens": undefined,
                "noCacheTokens": 3,
              },
              "inputTokens": 3,
              "outputTokenDetails": {
                "reasoningTokens": undefined,
                "textTokens": 10,
              },
              "outputTokens": 10,
              "raw": undefined,
              "reasoningTokens": undefined,
              "totalTokens": 13,
            },
          },
        ]
      `);
  });

  it('should not call execute for provider-executed tool calls', async () => {
    let toolExecuted = false;

    const inputStream: ReadableStream<LanguageModelV3StreamPart> =
      convertArrayToReadableStream([
        {
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'providerTool',
          input: `{ "value": "test" }`,
          providerExecuted: true,
        },
        {
          type: 'tool-result',
          toolCallId: 'call-1',
          toolName: 'providerTool',
          providerExecuted: true,
          result: { example: 'example' },
        },
        {
          type: 'finish',
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: testUsage,
        },
      ]);

    const transformedStream = runToolsTransformation({
      generateId: mockId({ prefix: 'id' }),
      tools: {
        providerTool: {
          inputSchema: z.object({ value: z.string() }),
          execute: async ({ value }) => {
            toolExecuted = true;
            return `${value}-should-not-execute`;
          },
        },
      },
      generatorStream: inputStream,
      toolChoice: undefined,
      tracer: new MockTracer(),
      telemetry: undefined,
      messages: [],
      system: undefined,
      abortSignal: undefined,
      repairToolCall: undefined,
      experimental_context: undefined,
    });

    await convertReadableStreamToArray(transformedStream);

    expect(toolExecuted).toBe(false);
  });

  describe('provider-emitted tool-approval-request (MCP flow)', () => {
    it('should forward provider-emitted tool-approval-request with the correct tool call', async () => {
      const inputStream: ReadableStream<LanguageModelV3StreamPart> =
        convertArrayToReadableStream([
          {
            type: 'tool-call',
            toolCallId: 'mcp-call-1',
            toolName: 'mcp_tool',
            input: `{ "query": "test" }`,
            providerExecuted: true,
          },
          {
            type: 'tool-approval-request',
            approvalId: 'mcp-approval-1',
            toolCallId: 'mcp-call-1',
          },
          {
            type: 'finish',
            finishReason: { unified: 'tool-calls', raw: undefined },
            usage: testUsage,
          },
        ]);

      const transformedStream = runToolsTransformation({
        generateId: mockId({ prefix: 'id' }),
        tools: {
          mcp_tool: {
            type: 'provider',
            id: 'mcp.mcp_tool',
            inputSchema: z.object({ query: z.string() }),
            args: {},
          },
        },
        generatorStream: inputStream,
        toolChoice: undefined,
        tracer: new MockTracer(),
        telemetry: undefined,
        messages: [],
        system: undefined,
        abortSignal: undefined,
        repairToolCall: undefined,
        experimental_context: undefined,
      });

      const result = await convertReadableStreamToArray(transformedStream);

      expect(result).toMatchInlineSnapshot(`
        [
          {
            "input": {
              "query": "test",
            },
            "providerExecuted": true,
            "providerMetadata": undefined,
            "title": undefined,
            "toolCallId": "mcp-call-1",
            "toolName": "mcp_tool",
            "type": "tool-call",
          },
          {
            "approvalId": "mcp-approval-1",
            "toolCall": {
              "input": {
                "query": "test",
              },
              "providerExecuted": true,
              "providerMetadata": undefined,
              "title": undefined,
              "toolCallId": "mcp-call-1",
              "toolName": "mcp_tool",
              "type": "tool-call",
            },
            "type": "tool-approval-request",
          },
          {
            "finishReason": "tool-calls",
            "providerMetadata": undefined,
            "rawFinishReason": undefined,
            "type": "finish",
            "usage": {
              "cachedInputTokens": undefined,
              "inputTokenDetails": {
                "cacheReadTokens": undefined,
                "cacheWriteTokens": undefined,
                "noCacheTokens": 3,
              },
              "inputTokens": 3,
              "outputTokenDetails": {
                "reasoningTokens": undefined,
                "textTokens": 10,
              },
              "outputTokens": 10,
              "raw": undefined,
              "reasoningTokens": undefined,
              "totalTokens": 13,
            },
          },
        ]
      `);
    });

    it('should emit error when tool call is not found for provider approval request', async () => {
      const inputStream: ReadableStream<LanguageModelV3StreamPart> =
        convertArrayToReadableStream([
          // No tool-call part before the approval request
          {
            type: 'tool-approval-request',
            approvalId: 'mcp-approval-1',
            toolCallId: 'non-existent-call',
          },
          {
            type: 'finish',
            finishReason: { unified: 'stop', raw: undefined },
            usage: testUsage,
          },
        ]);

      const transformedStream = runToolsTransformation({
        generateId: mockId({ prefix: 'id' }),
        tools: undefined,
        generatorStream: inputStream,
        toolChoice: undefined,
        tracer: new MockTracer(),
        telemetry: undefined,
        messages: [],
        system: undefined,
        abortSignal: undefined,
        repairToolCall: undefined,
        experimental_context: undefined,
      });

      const result = await convertReadableStreamToArray(transformedStream);

      expect(result).toMatchInlineSnapshot(`
        [
          {
            "error": [AI_ToolCallNotFoundForApprovalError: Tool call "non-existent-call" not found for approval request "mcp-approval-1".],
            "type": "error",
          },
          {
            "finishReason": "stop",
            "providerMetadata": undefined,
            "rawFinishReason": undefined,
            "type": "finish",
            "usage": {
              "cachedInputTokens": undefined,
              "inputTokenDetails": {
                "cacheReadTokens": undefined,
                "cacheWriteTokens": undefined,
                "noCacheTokens": 3,
              },
              "inputTokens": 3,
              "outputTokenDetails": {
                "reasoningTokens": undefined,
                "textTokens": 10,
              },
              "outputTokens": 10,
              "raw": undefined,
              "reasoningTokens": undefined,
              "totalTokens": 13,
            },
          },
        ]
      `);
    });

    it('should handle multiple provider-executed tool calls with approval requests', async () => {
      const inputStream: ReadableStream<LanguageModelV3StreamPart> =
        convertArrayToReadableStream([
          {
            type: 'tool-call',
            toolCallId: 'mcp-call-1',
            toolName: 'mcp_search',
            input: `{ "query": "first" }`,
            providerExecuted: true,
          },
          {
            type: 'tool-call',
            toolCallId: 'mcp-call-2',
            toolName: 'mcp_execute',
            input: `{ "command": "ls" }`,
            providerExecuted: true,
          },
          {
            type: 'tool-approval-request',
            approvalId: 'approval-1',
            toolCallId: 'mcp-call-1',
          },
          {
            type: 'tool-approval-request',
            approvalId: 'approval-2',
            toolCallId: 'mcp-call-2',
          },
          {
            type: 'finish',
            finishReason: { unified: 'tool-calls', raw: undefined },
            usage: testUsage,
          },
        ]);

      const transformedStream = runToolsTransformation({
        generateId: mockId({ prefix: 'id' }),
        tools: {
          mcp_search: {
            type: 'provider',
            id: 'mcp.mcp_search',
            inputSchema: z.object({ query: z.string() }),
            args: {},
          },
          mcp_execute: {
            type: 'provider',
            id: 'mcp.mcp_execute',
            inputSchema: z.object({ command: z.string() }),
            args: {},
          },
        },
        generatorStream: inputStream,
        toolChoice: undefined,
        tracer: new MockTracer(),
        telemetry: undefined,
        messages: [],
        system: undefined,
        abortSignal: undefined,
        repairToolCall: undefined,
        experimental_context: undefined,
      });

      const result = await convertReadableStreamToArray(transformedStream);

      expect(result).toMatchInlineSnapshot(`
        [
          {
            "input": {
              "query": "first",
            },
            "providerExecuted": true,
            "providerMetadata": undefined,
            "title": undefined,
            "toolCallId": "mcp-call-1",
            "toolName": "mcp_search",
            "type": "tool-call",
          },
          {
            "input": {
              "command": "ls",
            },
            "providerExecuted": true,
            "providerMetadata": undefined,
            "title": undefined,
            "toolCallId": "mcp-call-2",
            "toolName": "mcp_execute",
            "type": "tool-call",
          },
          {
            "approvalId": "approval-1",
            "toolCall": {
              "input": {
                "query": "first",
              },
              "providerExecuted": true,
              "providerMetadata": undefined,
              "title": undefined,
              "toolCallId": "mcp-call-1",
              "toolName": "mcp_search",
              "type": "tool-call",
            },
            "type": "tool-approval-request",
          },
          {
            "approvalId": "approval-2",
            "toolCall": {
              "input": {
                "command": "ls",
              },
              "providerExecuted": true,
              "providerMetadata": undefined,
              "title": undefined,
              "toolCallId": "mcp-call-2",
              "toolName": "mcp_execute",
              "type": "tool-call",
            },
            "type": "tool-approval-request",
          },
          {
            "finishReason": "tool-calls",
            "providerMetadata": undefined,
            "rawFinishReason": undefined,
            "type": "finish",
            "usage": {
              "cachedInputTokens": undefined,
              "inputTokenDetails": {
                "cacheReadTokens": undefined,
                "cacheWriteTokens": undefined,
                "noCacheTokens": 3,
              },
              "inputTokens": 3,
              "outputTokenDetails": {
                "reasoningTokens": undefined,
                "textTokens": 10,
              },
              "outputTokens": 10,
              "raw": undefined,
              "reasoningTokens": undefined,
              "totalTokens": 13,
            },
          },
        ]
      `);
    });
  });

  describe('Tool.onInputAvailable', () => {
    it('should call onInputAvailable before the tool call is executed', async () => {
      const output: unknown[] = [];
      const inputStream: ReadableStream<LanguageModelV3StreamPart> =
        convertArrayToReadableStream([
          {
            type: 'tool-call',
            toolCallId: 'call-1',
            toolName: 'onInputAvailableTool',
            input: `{ "value": "test" }`,
          },
          {
            type: 'finish',
            finishReason: { unified: 'stop', raw: 'stop' },
            usage: testUsage,
          },
        ]);

      const transformedStream = runToolsTransformation({
        generateId: mockId({ prefix: 'id' }),
        tools: {
          onInputAvailableTool: tool({
            inputSchema: z.object({ value: z.string() }),
            onInputAvailable: async ({ input }) => {
              output.push({ type: 'onInputAvailable', input });
            },
          }),
        },
        generatorStream: inputStream,
        toolChoice: undefined,
        tracer: new MockTracer(),
        telemetry: undefined,
        messages: [],
        system: undefined,
        abortSignal: undefined,
        repairToolCall: undefined,
        experimental_context: undefined,
      });

      // consume each chunk to maintain order
      const reader = transformedStream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output.push(value);
      }

      expect(output).toMatchInlineSnapshot(`
        [
          {
            "input": {
              "value": "test",
            },
            "type": "onInputAvailable",
          },
          {
            "input": {
              "value": "test",
            },
            "providerExecuted": undefined,
            "providerMetadata": undefined,
            "title": undefined,
            "toolCallId": "call-1",
            "toolName": "onInputAvailableTool",
            "type": "tool-call",
          },
          {
            "finishReason": "stop",
            "providerMetadata": undefined,
            "rawFinishReason": "stop",
            "type": "finish",
            "usage": {
              "cachedInputTokens": undefined,
              "inputTokenDetails": {
                "cacheReadTokens": undefined,
                "cacheWriteTokens": undefined,
                "noCacheTokens": 3,
              },
              "inputTokens": 3,
              "outputTokenDetails": {
                "reasoningTokens": undefined,
                "textTokens": 10,
              },
              "outputTokens": 10,
              "raw": undefined,
              "reasoningTokens": undefined,
              "totalTokens": 13,
            },
          },
        ]
      `);
    });

    it('should call onInputAvailable when the tool needs approval', async () => {
      const output: unknown[] = [];
      const inputStream: ReadableStream<LanguageModelV3StreamPart> =
        convertArrayToReadableStream([
          {
            type: 'tool-call',
            toolCallId: 'call-1',
            toolName: 'onInputAvailableTool',
            input: `{ "value": "test" }`,
          },
          {
            type: 'finish',
            finishReason: { unified: 'stop', raw: 'stop' },
            usage: testUsage,
          },
        ]);

      const transformedStream = runToolsTransformation({
        generateId: mockId({ prefix: 'id' }),
        tools: {
          onInputAvailableTool: tool({
            inputSchema: z.object({ value: z.string() }),
            onInputAvailable: async ({ input }) => {
              output.push({ type: 'onInputAvailable', input });
            },
            needsApproval: true,
          }),
        },
        generatorStream: inputStream,
        toolChoice: undefined,
        tracer: new MockTracer(),
        telemetry: undefined,
        messages: [],
        system: undefined,
        abortSignal: undefined,
        repairToolCall: undefined,
        experimental_context: undefined,
      });

      // consume each chunk to maintain order
      const reader = transformedStream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output.push(value);
      }

      expect(output).toMatchInlineSnapshot(`
        [
          {
            "input": {
              "value": "test",
            },
            "type": "onInputAvailable",
          },
          {
            "input": {
              "value": "test",
            },
            "providerExecuted": undefined,
            "providerMetadata": undefined,
            "title": undefined,
            "toolCallId": "call-1",
            "toolName": "onInputAvailableTool",
            "type": "tool-call",
          },
          {
            "approvalId": "id-0",
            "toolCall": {
              "input": {
                "value": "test",
              },
              "providerExecuted": undefined,
              "providerMetadata": undefined,
              "title": undefined,
              "toolCallId": "call-1",
              "toolName": "onInputAvailableTool",
              "type": "tool-call",
            },
            "type": "tool-approval-request",
          },
          {
            "finishReason": "stop",
            "providerMetadata": undefined,
            "rawFinishReason": "stop",
            "type": "finish",
            "usage": {
              "cachedInputTokens": undefined,
              "inputTokenDetails": {
                "cacheReadTokens": undefined,
                "cacheWriteTokens": undefined,
                "noCacheTokens": 3,
              },
              "inputTokens": 3,
              "outputTokenDetails": {
                "reasoningTokens": undefined,
                "textTokens": 10,
              },
              "outputTokens": 10,
              "raw": undefined,
              "reasoningTokens": undefined,
              "totalTokens": 13,
            },
          },
        ]
      `);
    });
  });

  describe('forced toolChoice filters extra tool calls', () => {
    it('should filter out tool calls that do not match the forced tool name', async () => {
      const inputStream: ReadableStream<LanguageModelV3StreamPart> =
        convertArrayToReadableStream([
          {
            type: 'tool-input-start',
            id: 'call-1',
            toolName: 'tool1',
          },
          {
            type: 'tool-input-delta',
            id: 'call-1',
            delta: '{ "value": "v1" }',
          },
          {
            type: 'tool-input-end',
            id: 'call-1',
          },
          {
            type: 'tool-call',
            toolCallId: 'call-1',
            toolName: 'tool1',
            input: '{ "value": "v1" }',
          },
          // Extra tool call that should be filtered:
          {
            type: 'tool-input-start',
            id: 'call-2',
            toolName: 'tool2',
          },
          {
            type: 'tool-input-delta',
            id: 'call-2',
            delta: '{ "value": "v2" }',
          },
          {
            type: 'tool-input-end',
            id: 'call-2',
          },
          {
            type: 'tool-call',
            toolCallId: 'call-2',
            toolName: 'tool2',
            input: '{ "value": "v2" }',
          },
          {
            type: 'finish',
            finishReason: { unified: 'tool-calls', raw: undefined },
            usage: testUsage,
          },
        ]);

      const transformedStream = runToolsTransformation({
        generateId: mockId({ prefix: 'id' }),
        tools: {
          tool1: tool({
            inputSchema: z.object({ value: z.string() }),
            execute: async () => 'result1',
          }),
          tool2: tool({
            inputSchema: z.object({ value: z.string() }),
            execute: async () => 'result2',
          }),
        },
        generatorStream: inputStream,
        toolChoice: { type: 'tool', toolName: 'tool1' },
        tracer: new MockTracer(),
        telemetry: undefined,
        messages: [],
        system: undefined,
        abortSignal: undefined,
        repairToolCall: undefined,
        experimental_context: undefined,
      });

      const result = await convertReadableStreamToArray(transformedStream);

      // Should only have tool1 call and result, not tool2:
      const toolCalls = result.filter(r => r.type === 'tool-call');
      const toolResults = result.filter(r => r.type === 'tool-result');
      const toolInputStarts = result.filter(r => r.type === 'tool-input-start');

      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]).toMatchObject({
        type: 'tool-call',
        toolName: 'tool1',
        toolCallId: 'call-1',
      });

      expect(toolResults).toHaveLength(1);
      expect(toolResults[0]).toMatchObject({
        type: 'tool-result',
        toolName: 'tool1',
        toolCallId: 'call-1',
      });

      expect(toolInputStarts).toHaveLength(1);
      expect(toolInputStarts[0]).toMatchObject({
        type: 'tool-input-start',
        toolName: 'tool1',
        id: 'call-1',
      });

      // Verify tool2 was completely filtered out:
      const tool2Parts = result.filter(
        r =>
          (r.type === 'tool-call' && r.toolName === 'tool2') ||
          (r.type === 'tool-result' && r.toolName === 'tool2') ||
          (r.type === 'tool-input-start' && r.toolName === 'tool2') ||
          (r.type === 'tool-input-delta' && r.id === 'call-2') ||
          (r.type === 'tool-input-end' && r.id === 'call-2'),
      );
      expect(tool2Parts).toHaveLength(0);
    });

    it('should not filter when toolChoice is auto', async () => {
      const inputStream: ReadableStream<LanguageModelV3StreamPart> =
        convertArrayToReadableStream([
          {
            type: 'tool-call',
            toolCallId: 'call-1',
            toolName: 'tool1',
            input: '{ "value": "v1" }',
          },
          {
            type: 'tool-call',
            toolCallId: 'call-2',
            toolName: 'tool2',
            input: '{ "value": "v2" }',
          },
          {
            type: 'finish',
            finishReason: { unified: 'tool-calls', raw: undefined },
            usage: testUsage,
          },
        ]);

      const transformedStream = runToolsTransformation({
        generateId: mockId({ prefix: 'id' }),
        tools: {
          tool1: tool({
            inputSchema: z.object({ value: z.string() }),
            execute: async () => 'result1',
          }),
          tool2: tool({
            inputSchema: z.object({ value: z.string() }),
            execute: async () => 'result2',
          }),
        },
        generatorStream: inputStream,
        toolChoice: { type: 'auto' },
        tracer: new MockTracer(),
        telemetry: undefined,
        messages: [],
        system: undefined,
        abortSignal: undefined,
        repairToolCall: undefined,
        experimental_context: undefined,
      });

      const result = await convertReadableStreamToArray(transformedStream);

      // Should have both tool calls when toolChoice is auto:
      const toolCalls = result.filter(r => r.type === 'tool-call');
      expect(toolCalls).toHaveLength(2);
      expect(toolCalls[0].toolName).toBe('tool1');
      expect(toolCalls[1].toolName).toBe('tool2');
    });
  });

  describe('tool execution error handling', () => {
    it('should handle error thrown in async tool execution', async () => {
      const inputStream: ReadableStream<LanguageModelV3StreamPart> =
        convertArrayToReadableStream([
          {
            type: 'tool-call',
            toolCallId: 'call-1',
            toolName: 'failingTool',
            input: `{ "value": "test" }`,
          },
          {
            type: 'finish',
            finishReason: { unified: 'stop', raw: 'stop' },
            usage: testUsage,
          },
        ]);

      const toolError = new Error('Tool execution failed!');

      const transformedStream = runToolsTransformation({
        generateId: mockId({ prefix: 'id' }),
        tools: {
          failingTool: {
            title: 'Failing Tool',
            inputSchema: z.object({ value: z.string() }),
            execute: async ({ value }) => {
              await delay(10);
              throw toolError;
            },
          },
        },
        generatorStream: inputStream,
        toolChoice: undefined,
        tracer: new MockTracer(),
        telemetry: undefined,
        messages: [],
        system: undefined,
        abortSignal: undefined,
        repairToolCall: undefined,
        experimental_context: undefined,
      });

      const result = await convertReadableStreamToArray(transformedStream);

      // tool-call should come first
      expect(result[0]).toMatchObject({
        type: 'tool-call',
        toolCallId: 'call-1',
        toolName: 'failingTool',
      });

      // tool-error should be included
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'tool-error',
          toolCallId: 'call-1',
          toolName: 'failingTool',
          error: toolError,
        }),
      );

      // finish should come last (stream closes properly)
      expect(result[result.length - 1]).toMatchObject({
        type: 'finish',
        finishReason: 'stop',
      });
    });

    it('should handle error thrown in sync tool execution', async () => {
      const inputStream: ReadableStream<LanguageModelV3StreamPart> =
        convertArrayToReadableStream([
          {
            type: 'tool-call',
            toolCallId: 'call-1',
            toolName: 'failingTool',
            input: `{ "value": "test" }`,
          },
          {
            type: 'finish',
            finishReason: { unified: 'stop', raw: 'stop' },
            usage: testUsage,
          },
        ]);

      const toolError = new Error('Sync tool failed!');

      const transformedStream = runToolsTransformation({
        generateId: mockId({ prefix: 'id' }),
        tools: {
          failingTool: {
            title: 'Failing Tool',
            inputSchema: z.object({ value: z.string() }),
            execute: ({ value }) => {
              throw toolError;
            },
          },
        },
        generatorStream: inputStream,
        toolChoice: undefined,
        tracer: new MockTracer(),
        telemetry: undefined,
        messages: [],
        system: undefined,
        abortSignal: undefined,
        repairToolCall: undefined,
        experimental_context: undefined,
      });

      const result = await convertReadableStreamToArray(transformedStream);

      // tool-error should be included
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'tool-error',
          toolCallId: 'call-1',
          toolName: 'failingTool',
          error: toolError,
        }),
      );

      // stream should close properly
      expect(result[result.length - 1]).toMatchObject({
        type: 'finish',
      });
    });
  });
});
