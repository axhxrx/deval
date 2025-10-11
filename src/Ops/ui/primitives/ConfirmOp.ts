import { getNextSimulatedInput } from '../../../runtime/UserInputQueue.ts';
import type { Outcome } from '../../base/types.ts';
import { UIOp } from '../../base/UIOp.ts';
import { ShowInfoOp } from './ShowInfoOp.ts';

/**
Options for ConfirmOp
*/
export interface ConfirmOptions
{
  /**
  Default choice when user just presses Enter
  */
  defaultChoice?: boolean;

  /**
  Optional additional information to show when user selects "More info"

  Can be a string, array of strings, or an Op to run
  */
  moreInfo?: string | string[] | UIOp<void>;
}

/**
Confirmation Op with Yes/No and optional More Info

Returns a boolean: true for Yes, false for No
If moreInfo is provided, shows it and asks again
*/
export class ConfirmOp extends UIOp<boolean>
{
  private readonly defaultChoice: boolean;
  private readonly moreInfo?: string | string[] | UIOp<void>;

  constructor(
    private readonly message: string,
    options?: ConfirmOptions,
  )
  {
    super(`Confirm: ${message}`);
    this.defaultChoice = options?.defaultChoice ?? true;
    this.moreInfo = options?.moreInfo;
  }

  protected async performOp(): Promise<Outcome<boolean>>
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

        let value: string;
        const simulatedInput = getNextSimulatedInput('confirm');

        if (simulatedInput)
        {
          // Simulated input
          value = simulatedInput.value;
          const displayMap: Record<string, string> = {
            yes: '✅ Yes',
            no: '❌ No',
            help: 'ℹ️  More info',
          };
          console.log(this.message);
          console.log(`> ${displayMap[value] || value}`);
        }
        else
        {
          // Interactive mode
          // Lazy load the prompt library to avoid signal handler leaks in tests
          const { promptSelect: stdPromptSelect } = await import('@std/cli/unstable-prompt-select');

          const selected = stdPromptSelect(this.message, options);

          if (selected?.includes('Yes')) value = 'yes';
          else if (selected?.includes('No')) value = 'no';
          else if (selected?.includes('More info')) value = 'help';
          else value = 'no'; // Default fallback
        }

        // Parse the response
        let response: 'yes' | 'no' | 'more_info';

        if (value === 'yes')
        {
          response = 'yes';
        }
        else if (value === 'help')
        {
          response = 'more_info';
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
            const infoOp = new ShowInfoOp('Additional Information', this.moreInfo);
            await infoOp.run();
          }
          else
          {
            // It's an Op
            await this.moreInfo.run();
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
  const example = new ConfirmOp(
    'Do you want to proceed with the Op?',
    {
      moreInfo: ['This Op will:', '• Process all files', '• Update the database', '• Cannot be undone'],
    },
  );

  const result = await example.run();
  console.log('\nRESULT:', result);
}
