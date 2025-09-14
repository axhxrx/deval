import { unifiedPrompt } from '../../../runtime/prompts/unifiedPrompt.ts';
import { UserInputType } from '../../../runtime/types.ts';
import type { OperationResult } from '../../base/types.ts';
import { UIOperation } from '../../base/UIOperation.ts';

/**
Generic selection operation for choosing from a list of options

This is a UI primitive that:
- Presents a list of options to the user
- Returns the selected value or null on cancellation
- Supports automated testing via input queue
- Hides the specific prompt library from consumers
*/
export class SelectOperation<T extends string> extends UIOperation<T | null>
{
  constructor(
    private readonly message: string,
    private readonly options: readonly T[],
    private readonly allowCancel: boolean = true,
  )
  {
    super(`Select: ${message}`);
  }

  protected async performOperation(): Promise<OperationResult<T | null>>
  {
    try
    {
      const value = await unifiedPrompt<T>({
        message: this.message,
        inputType: UserInputType.Select,
        interactive: async () =>
        {
          // Lazy load the prompt library to avoid signal handler leaks in tests
          const { promptSelect: stdPromptSelect } = await import('@std/cli/unstable-prompt-select');

          // Convert readonly array to mutable for std prompt
          const mutableOptions = [...this.options];

          if (this.allowCancel)
          {
            // Add cancel option at the end
            mutableOptions.push('❌ Cancel' as T);
          }

          const selected = stdPromptSelect(this.message, mutableOptions);

          // Check if cancel was selected
          if (this.allowCancel && selected === '❌ Cancel')
          {
            return null as any;
          }

          return selected;
        },
        formatValue: (value) =>
        {
          // For select, the value is the index, need to get actual option
          if (typeof value === 'number')
          {
            return this.options[value] || 'Invalid selection';
          }
          return String(value);
        },
      });

      // Special handling for index-based selection from queue
      if (typeof value === 'number')
      {
        const index = value as number;
        if (index >= 0 && index < this.options.length)
        {
          const selected = this.options[index];
          console.log(`${this.message}`);
          console.log(`> ${selected} (simulated)`);
          return { success: true, data: selected };
        }
        // Invalid index means cancellation
        return { success: true, data: null };
      }

      return { success: true, data: value };
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
