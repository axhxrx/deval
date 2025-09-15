import { unifiedPrompt } from '../../../runtime/prompts/unifiedPrompt.ts';
import { UserInputType } from '../../../runtime/types.ts';
import type { OperationResult } from '../../base/types.ts';
import { UIOperation } from '../../base/UIOperation.ts';
import { ShowInfoOperation } from './ShowInfoOperation.ts';

/**
Options for ConfirmOperation
*/
export interface ConfirmOptions
{
  /**
  Default choice when user just presses Enter
  */
  defaultChoice?: boolean;

  /**
  Optional additional information to show when user selects "More info"

  Can be a string, array of strings, or an operation to execute
  */
  moreInfo?: string | string[] | UIOperation<void>;
}

/**
Confirmation operation with Yes/No and optional More Info

Returns a boolean: true for Yes, false for No
If moreInfo is provided, shows it and asks again
*/
export class ConfirmOperation extends UIOperation<boolean>
{
  private readonly defaultChoice: boolean;
  private readonly moreInfo?: string | string[] | UIOperation<void>;

  constructor(
    private readonly message: string,
    options?: ConfirmOptions,
  )
  {
    super(`Confirm: ${message}`);
    this.defaultChoice = options?.defaultChoice ?? true;
    this.moreInfo = options?.moreInfo;
  }

  protected async performOperation(): Promise<OperationResult<boolean>>
  {
    try
    {
      // Keep asking until we get yes or no
      while (true)
      {
        const options = this.moreInfo
          ? ['✅ Yes', '❌ No', 'ℹ️  More info']
          : ['✅ Yes', '❌ No'];

        // Reorder based on default
        if (!this.defaultChoice)
        {
          options.reverse();
        }

        const value = await unifiedPrompt<string | boolean>({
          message: this.message,
          inputType: 'confirm',
          interactive: async () =>
          {
            // Lazy load the prompt library to avoid signal handler leaks in tests
            const { promptSelect: stdPromptSelect } = await import('@std/cli/unstable-prompt-select');

            const selected = stdPromptSelect(this.message, options);

            if (selected?.includes('Yes')) return 'yes';
            if (selected?.includes('No')) return 'no';
            if (selected?.includes('More info')) return 'more_info';
            return 'no'; // Default fallback
          },
        });

        // Parse the response
        let response: 'yes' | 'no' | 'more_info';

        if (typeof value === 'boolean')
        {
          response = value ? 'yes' : 'no';
        }
        else if (typeof value === 'string')
        {
          const lower = String(value).toLowerCase();
          if (lower === 'yes' || lower === 'y' || lower === 'true')
          {
            response = 'yes';
          }
          else if (lower === 'more' || lower === 'info' || lower === 'more_info')
          {
            response = 'more_info';
          }
          else
          {
            response = 'no';
          }
        }
        else
        {
          response = 'no';
        }

        // Handle the response
        if (response === 'more_info' && this.moreInfo)
        {
          // Show more info
          if (typeof this.moreInfo === 'string' || Array.isArray(this.moreInfo))
          {
            const infoOp = new ShowInfoOperation('Additional Information', this.moreInfo);
            await infoOp.execute();
          }
          else
          {
            // It's an operation
            await this.moreInfo.execute();
          }
          // Loop back to ask again
          continue;
        }

        // Return yes or no
        return { success: true, data: response === 'yes' };
      }
    }
    catch (error: unknown)
    {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during confirmation',
      };
    }
  }
}

// Make it runnable as a standalone program
if (import.meta.main)
{
  const example = new ConfirmOperation(
    'Do you want to proceed with the operation?',
    {
      moreInfo: ['This operation will:', '• Process all files', '• Update the database', '• Cannot be undone'],
    },
  );

  const result = await example.execute();
  console.log('\nRESULT:', result);
}
