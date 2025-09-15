import { promptSelect as stdPromptSelect } from '@std/cli/unstable-prompt-select';
import { getUserInputQueue } from './UserInputQueue.ts';

/**
Wrapper for promptSelect that checks UserInputQueue first

This allows simulated inputs to drive the CLI
*/
export function promptSelect<T extends string>(
  message: string,
  options: T[],
): T | null
{
  const queue = getUserInputQueue();

  if (queue)
  {
    const input = queue.getNext('select');
    if (input && typeof input.value === 'number')
    {
      const index = input.value;
      if (index >= 0 && index < options.length)
      {
        const selected = options[index];
        console.log(`${message}`);
        console.log(`> ${selected} (simulated)`);
        return selected;
      }
    }
  }

  // Fall back to actual prompt
  return stdPromptSelect(message, options) as T | null;
}
