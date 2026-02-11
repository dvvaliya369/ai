import { LanguageModelV3Content } from '@ai-sdk/provider';
import { describe, expect, it } from 'vitest';
import {
  filterContentToolCalls,
  shouldFilterToolCall,
} from './filter-tool-calls';

describe('filter-tool-calls', () => {
  describe('shouldFilterToolCall', () => {
    it('should return false when toolChoice is undefined', () => {
      expect(shouldFilterToolCall(undefined, 'anyTool')).toBe(false);
    });

    it('should return false when toolChoice is auto', () => {
      expect(shouldFilterToolCall({ type: 'auto' }, 'anyTool')).toBe(false);
    });

    it('should return false when toolChoice is required', () => {
      expect(shouldFilterToolCall({ type: 'required' }, 'anyTool')).toBe(false);
    });

    it('should return false when toolChoice is none', () => {
      expect(shouldFilterToolCall({ type: 'none' }, 'anyTool')).toBe(false);
    });

    it('should return false when tool name matches forced tool', () => {
      expect(
        shouldFilterToolCall(
          { type: 'tool', toolName: 'specificTool' },
          'specificTool',
        ),
      ).toBe(false);
    });

    it('should return true when tool name does not match forced tool', () => {
      expect(
        shouldFilterToolCall(
          { type: 'tool', toolName: 'specificTool' },
          'otherTool',
        ),
      ).toBe(true);
    });
  });

  describe('filterContentToolCalls', () => {
    const sampleContent: Array<LanguageModelV3Content> = [
      { type: 'text', text: 'Hello' },
      {
        type: 'tool-call',
        toolCallId: 'call-1',
        toolName: 'tool1',
        input: '{}',
      },
      {
        type: 'tool-call',
        toolCallId: 'call-2',
        toolName: 'tool2',
        input: '{}',
      },
      { type: 'text', text: 'World' },
    ];

    it('should return content unchanged when toolChoice is undefined', () => {
      const result = filterContentToolCalls(sampleContent, undefined);
      expect(result).toEqual(sampleContent);
    });

    it('should return content unchanged when toolChoice is auto', () => {
      const result = filterContentToolCalls(sampleContent, { type: 'auto' });
      expect(result).toEqual(sampleContent);
    });

    it('should return content unchanged when toolChoice is required', () => {
      const result = filterContentToolCalls(sampleContent, {
        type: 'required',
      });
      expect(result).toEqual(sampleContent);
    });

    it('should filter out tool calls that do not match forced tool', () => {
      const result = filterContentToolCalls(sampleContent, {
        type: 'tool',
        toolName: 'tool1',
      });

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        { type: 'text', text: 'Hello' },
        {
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'tool1',
          input: '{}',
        },
        { type: 'text', text: 'World' },
      ]);
    });

    it('should keep non-tool-call content unchanged', () => {
      const result = filterContentToolCalls(sampleContent, {
        type: 'tool',
        toolName: 'tool1',
      });

      const textParts = result.filter(part => part.type === 'text');
      expect(textParts).toHaveLength(2);
      expect(textParts[0]).toEqual({ type: 'text', text: 'Hello' });
      expect(textParts[1]).toEqual({ type: 'text', text: 'World' });
    });

    it('should handle content with no tool calls', () => {
      const contentWithoutTools: Array<LanguageModelV3Content> = [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: 'World' },
      ];

      const result = filterContentToolCalls(contentWithoutTools, {
        type: 'tool',
        toolName: 'tool1',
      });

      expect(result).toEqual(contentWithoutTools);
    });

    it('should handle empty content array', () => {
      const result = filterContentToolCalls([], {
        type: 'tool',
        toolName: 'tool1',
      });

      expect(result).toEqual([]);
    });
  });
});
