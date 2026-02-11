import { convertArrayToReadableStream } from '@ai-sdk/provider-utils/test';
import { z } from 'zod/v4';
import { describe, expect, it } from 'vitest';
import { MockLanguageModelV3 } from '../test/mock-language-model-v3';
import { generateText } from './generate-text';
import { streamText } from './stream-text';
import { tool } from '@ai-sdk/provider-utils';
import { stepCountIs } from './stop-condition';

const testUsage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};

describe('filter-tool-calls integration tests', () => {
  describe('non-streaming (generateText)', () => {
    it('should filter extra tool calls when toolChoice forces a specific tool', async () => {
      let callCount = 0;

      const result = await generateText({
        model: new MockLanguageModelV3({
          doGenerate: async () => {
            callCount++;

            if (callCount === 1) {
              // Model returns two tool calls even though toolChoice forces only tool1
              return {
                content: [
                  {
                    type: 'tool-call' as const,
                    toolCallType: 'function' as const,
                    toolCallId: 'call-1',
                    toolName: 'tool1',
                    input: '{ "value": "v1" }',
                  },
                  {
                    type: 'tool-call' as const,
                    toolCallType: 'function' as const,
                    toolCallId: 'call-2',
                    toolName: 'tool2',
                    input: '{ "value": "v2" }',
                  },
                ],
                finishReason: { unified: 'tool-calls', raw: undefined },
                usage: testUsage,
                warnings: [],
              };
            }

            // Second call returns text
            return {
              content: [{ type: 'text' as const, text: 'done' }],
              finishReason: { unified: 'stop', raw: 'stop' },
              usage: testUsage,
              warnings: [],
            };
          },
        }),
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
        prompt: 'test-input',
        stopWhen: stepCountIs(3),
        prepareStep: async () => ({
          toolChoice: { type: 'tool' as const, toolName: 'tool1' as const },
        }),
      });

      // Should only have tool1 call, not tool2
      expect(result.steps[0].toolCalls).toHaveLength(1);
      expect(result.steps[0].toolCalls[0].toolName).toBe('tool1');

      // Should complete without infinite loop
      expect(result.steps).toHaveLength(2);
      expect(result.text).toBe('done');
    });

    it('should not filter when toolChoice is auto', async () => {
      const result = await generateText({
        model: new MockLanguageModelV3({
          doGenerate: async () => ({
            content: [
              {
                type: 'tool-call' as const,
                toolCallType: 'function' as const,
                toolCallId: 'call-1',
                toolName: 'tool1',
                input: '{ "value": "v1" }',
              },
              {
                type: 'tool-call' as const,
                toolCallType: 'function' as const,
                toolCallId: 'call-2',
                toolName: 'tool2',
                input: '{ "value": "v2" }',
              },
            ],
            finishReason: { unified: 'tool-calls', raw: undefined },
            usage: testUsage,
            warnings: [],
          }),
        }),
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
        prompt: 'test-input',
        toolChoice: 'auto',
      });

      // Should have both tool calls when toolChoice is auto
      expect(result.toolCalls).toHaveLength(2);
      expect(result.toolCalls.map(tc => tc.toolName)).toEqual([
        'tool1',
        'tool2',
      ]);
    });
  });

  describe('streaming (streamText)', () => {
    it('should filter extra tool calls when toolChoice forces a specific tool', async () => {
      let callCount = 0;

      const result = streamText({
        model: new MockLanguageModelV3({
          doStream: async () => {
            callCount++;

            if (callCount === 1) {
              // Model returns two tool calls even though toolChoice forces only tool1
              return {
                stream: convertArrayToReadableStream([
                  {
                    type: 'tool-call' as const,
                    toolCallId: 'call-1',
                    toolName: 'tool1',
                    input: '{ "value": "v1" }',
                  },
                  {
                    type: 'tool-call' as const,
                    toolCallId: 'call-2',
                    toolName: 'tool2',
                    input: '{ "value": "v2" }',
                  },
                  {
                    type: 'finish' as const,
                    finishReason: {
                      unified: 'tool-calls' as const,
                      raw: undefined,
                    },
                    usage: testUsage,
                  },
                ]),
                response: {},
              };
            }

            // Second call returns text
            return {
              stream: convertArrayToReadableStream([
                { type: 'text-start' as const, id: '1' },
                { type: 'text-delta' as const, id: '1', delta: 'done' },
                { type: 'text-end' as const, id: '1' },
                {
                  type: 'finish' as const,
                  finishReason: { unified: 'stop' as const, raw: 'stop' },
                  usage: testUsage,
                },
              ]),
              response: {},
            };
          },
        }),
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
        prompt: 'test-input',
        stopWhen: stepCountIs(3),
        prepareStep: async () => ({
          toolChoice: { type: 'tool' as const, toolName: 'tool1' as const },
        }),
      });

      // Collect all parts from the stream
      const parts: any[] = [];
      for await (const part of result.fullStream) {
        parts.push(part);
      }

      // Should only have tool1 call, not tool2
      const toolCallParts = parts.filter(p => p.type === 'tool-call');
      expect(toolCallParts).toHaveLength(1);
      expect(toolCallParts[0].toolName).toBe('tool1');

      // Should complete without infinite loop
      const text = await result.text;
      expect(text).toBe('done');
    });

    it('should filter tool-input-start/delta/end events for filtered tools', async () => {
      const result = streamText({
        model: new MockLanguageModelV3({
          doStream: async () => ({
            stream: convertArrayToReadableStream([
              {
                type: 'tool-input-start' as const,
                id: 'call-1',
                toolName: 'tool1',
              },
              {
                type: 'tool-input-delta' as const,
                id: 'call-1',
                delta: '{ "value": "v1" }',
              },
              { type: 'tool-input-end' as const, id: 'call-1' },
              {
                type: 'tool-call' as const,
                toolCallId: 'call-1',
                toolName: 'tool1',
                input: '{ "value": "v1" }',
              },
              // These should be filtered out:
              {
                type: 'tool-input-start' as const,
                id: 'call-2',
                toolName: 'tool2',
              },
              {
                type: 'tool-input-delta' as const,
                id: 'call-2',
                delta: '{ "value": "v2" }',
              },
              { type: 'tool-input-end' as const, id: 'call-2' },
              {
                type: 'tool-call' as const,
                toolCallId: 'call-2',
                toolName: 'tool2',
                input: '{ "value": "v2" }',
              },
              {
                type: 'finish' as const,
                finishReason: {
                  unified: 'tool-calls' as const,
                  raw: undefined,
                },
                usage: testUsage,
              },
            ]),
            response: {},
          }),
        }),
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
        prompt: 'test-input',
        prepareStep: async () => ({
          toolChoice: { type: 'tool' as const, toolName: 'tool1' as const },
        }),
      });

      // Collect all parts from the stream
      const parts: any[] = [];
      for await (const part of result.fullStream) {
        parts.push(part);
      }

      // Should only have tool-input events for tool1
      const toolInputStartParts = parts.filter(
        p => p.type === 'tool-input-start',
      );
      expect(toolInputStartParts).toHaveLength(1);
      expect(toolInputStartParts[0].toolName).toBe('tool1');

      const toolInputDeltaParts = parts.filter(
        p => p.type === 'tool-input-delta',
      );
      expect(toolInputDeltaParts).toHaveLength(1);

      const toolInputEndParts = parts.filter(p => p.type === 'tool-input-end');
      expect(toolInputEndParts).toHaveLength(1);
    });

    it('should not filter when toolChoice is auto', async () => {
      const result = streamText({
        model: new MockLanguageModelV3({
          doStream: async () => ({
            stream: convertArrayToReadableStream([
              {
                type: 'tool-call' as const,
                toolCallId: 'call-1',
                toolName: 'tool1',
                input: '{ "value": "v1" }',
              },
              {
                type: 'tool-call' as const,
                toolCallId: 'call-2',
                toolName: 'tool2',
                input: '{ "value": "v2" }',
              },
              {
                type: 'finish' as const,
                finishReason: {
                  unified: 'tool-calls' as const,
                  raw: undefined,
                },
                usage: testUsage,
              },
            ]),
            response: {},
          }),
        }),
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
        prompt: 'test-input',
        toolChoice: 'auto',
      });

      // Collect all parts from the stream
      const parts: any[] = [];
      for await (const part of result.fullStream) {
        parts.push(part);
      }

      // Should have both tool calls when toolChoice is auto
      const toolCallParts = parts.filter(p => p.type === 'tool-call');
      expect(toolCallParts).toHaveLength(2);
      expect(toolCallParts.map(tc => tc.toolName)).toEqual(['tool1', 'tool2']);
    });
  });
});
