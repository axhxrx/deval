import { Logger } from '../../logger/logger.ts';
import { UserInputType } from '../types.ts';
import { getUserInputQueue } from '../UserInputQueue.ts';

/**
Options for unified prompt handling
*/
export interface PromptOptions<T>
{
  /**
  The prompt message to display
  */
  message: string;

  /**
  Function to run in interactive mode (when no simulated input available)
  */
  interactive: () => T | Promise<T>;

  /**
  Type of input for queue matching
  */
  inputType: UserInputType;

  /**
  Optional formatter for display value
  */
  formatValue?: (value: T) => string;

  /**
  Whether to show "(simulated)" suffix when using queue
  */
  showSimulated?: boolean;
}

/**
Unified prompt handler that checks UserInputQueue first

This centralizes all prompt handling and enables simulated inputs for testing and automation. Higher-level operations don't need to know about the input queue.
*/
export async function unifiedPrompt<T>(options: PromptOptions<T>): Promise<T>
{
  const queue = getUserInputQueue();

  if (queue)
  {
    const input = queue.getNext(options.inputType);
    if (input)
    {
      // We have simulated input
      const value = input.value as T;

      // Log what we're simulating if needed
      if (options.showSimulated !== false)
      {
        const displayValue = options.formatValue ? options.formatValue(value) : String(value);
        Logger.debug(`Simulated ${options.inputType}: ${displayValue}`);
      }

      return value;
    }
  }

  // No simulated input, run interactive prompt
  return await Promise.resolve(options.interactive());
}
