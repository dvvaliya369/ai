import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { run } from '../lib/run';

const weather = tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async ({ location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
});

const time = tool({
  description: 'Get the current time',
  inputSchema: z.object({}),
  execute: async () => ({
    time: new Date().toISOString(),
  }),
});

run(async () => {
  const result = streamText({
    model: openai('gpt-4o'),
    prompt: 'What is the weather and time?',
    tools: { weather, time },
    prepareStep({ stepNumber }) {
      if (stepNumber === 0) {
        // Force the model to call the weather tool
        // Bug: if the model tries to call multiple tools (weather + time),
        // this causes an infinite loop
        return {
          toolChoice: { type: 'tool', toolName: 'weather' },
        };
      }
    },
    maxSteps: 5, // limit steps to avoid truly infinite loop in testing
  });

  await result.consumeStream();

  console.log(JSON.stringify(await result.steps, null, 2));
});
