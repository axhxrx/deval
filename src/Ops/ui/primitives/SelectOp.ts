import { getNextSimulatedInput } from '../../../runtime/UserInputQueue.ts';
import type { Outcome } from '../../base/types.ts';
import { UIOp } from '../../base/UIOp.ts';

/**
Generic selection Op for choosing from a list of options

This is a UI primitive that:
- Presents a list of options to the user
- Returns the selected value or null on cancellation
- Supports automated testing via input queue
- Hides the specific prompt library from consumers
*/
export class SelectOp<T extends string> extends UIOp<T | null>
{
  constructor(
    private readonly message: string,
    private readonly options: readonly T[],
    private readonly allowCancel: boolean = true,
  )
  {
    super(`Select: ${message}`);
  }

  protected async performOp(): Promise<Outcome<T | null>>
  {
    try
    {
      console.log(this.message);

      const simulatedInput = getNextSimulatedInput('select');

      if (simulatedInput)
      {
        // Simulated selection - use index to get option
        const index = simulatedInput.value;
        if (index >= 0 && index < this.options.length)
        {
          const selected = this.options[index];
          console.log(`> ${selected}`);
          return { success: true, data: selected };
        }
        // Invalid index means cancellation
        console.log('> (cancelled)');
        return { success: true, data: null };
      }
      else
      {
        // Interactive mode
        // Lazy load the prompt library to avoid signal handler leaks in tests
        const { promptSelect: stdPromptSelect } = await import('@std/cli/unstable-prompt-select');

        // Convert readonly array to mutable for std prompt
        const mutableOptions = [...this.options];

        if (this.allowCancel)
        {
          // Add cancel option at the end
          mutableOptions.push('❌ Cancel' as T);
        }

        const selected = stdPromptSelect('', mutableOptions);

        // Check if cancel was selected
        if (this.allowCancel && selected === '❌ Cancel')
        {
          return { success: true, data: null };
        }

        return { success: true, data: selected as T };
      }
    }
    catch (error: unknown)
    {
      // User cancelled (Ctrl+C) or error occurred
      if (error instanceof Error && error.message.includes('cancelled'))
      {
        return { success: true, data: null };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during selection',
      };
    }
  }
}

// Make it runnable as a standalone program
if (import.meta.main)
{
  const colors = ['Red', 'Green', 'Blue', 'Yellow'] as const;
  const example = new SelectOp(
    'What is your favorite color?',
    colors,
    true,
  );

  const result = await example.run();
  console.log('\nRESULT:', result);
}
