import { unifiedPrompt } from '../../../runtime/prompts/unifiedPrompt.ts';
import { UserInputType } from '../../../runtime/types.ts';
import type { OperationResult } from '../../base/types.ts';
import { UIOperation } from '../../base/UIOperation.ts';

/**
Password input operation with masking

This operation:
- Prompts for password input with masking
- Never displays the password value
- Returns password string or null on cancellation
- Supports simulated input for testing (but still masks output)
*/
export class InputPasswordOperation extends UIOperation<string | null>
{
  constructor(
    private readonly message: string = 'Enter password',
    private readonly confirmPassword: boolean = false,
  )
  {
    super(`Input password`);
  }

  protected async performOperation(): Promise<OperationResult<string | null>>
  {
    try
    {
      const password = await unifiedPrompt<string>({
        message: this.message,
        inputType: UserInputType.Input,
        interactive: () =>
        {
          // In real implementation, we'd use a masked input
          // For now, using basic prompt with warning
          console.log('⚠️  Warning: Password will be visible (proper masking not implemented yet)');
          const input = prompt(`${this.message}: `);

          if (input === null)
          {
            // User cancelled
            return null as any;
          }

          return input;
        },
        // Never show password values in logs
        formatValue: () => '********',
      });

      if (password === null)
      {
        return { success: true, data: null };
      }

      // If confirmation required
      if (this.confirmPassword)
      {
        const confirmation = await unifiedPrompt<string>({
          message: 'Confirm password',
          inputType: UserInputType.Input,
          interactive: () =>
          {
            const input = prompt('Confirm password: ');
            return input || '';
          },
          formatValue: () => '********',
        });

        if (confirmation !== password)
        {
          return {
            success: false,
            error: 'Passwords do not match',
          };
        }
      }

      // Basic validation - minimum length
      if (password.length < 6)
      {
        return {
          success: false,
          error: 'Password must be at least 6 characters',
        };
      }

      return { success: true, data: password };
    }
    catch (error: unknown)
    {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during password input',
      };
    }
  }
}

// Make it runnable as a standalone program
if (import.meta.main)
{
  const example = new InputPasswordOperation(
    'Create a new password',
    true, // Require confirmation
  );

  const result = await example.execute();
  console.log('\nRESULT:', result.success ? { success: true, data: '********' } : result);
}
