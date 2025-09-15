import { getNextSimulatedInput } from '../../../runtime/UserInputQueue.ts';
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
      console.log(`${this.message}:`);

      let password: string | null;
      const simulatedInput = getNextSimulatedInput('input');

      if (simulatedInput)
      {
        // Simulated input - show masked
        password = simulatedInput.value;
        console.log('> ********');
      }
      else
      {
        // Interactive input
        console.log('⚠️  Warning: Password will be visible (proper masking not implemented yet)');
        password = prompt('>');
      }

      if (password === null)
      {
        return { success: true, data: null };
      }

      // Basic validation - minimum length
      if (password.length < 6)
      {
        console.warn('Password must be at least 6 characters');
        // Recurse to try again
        return await this.performOperation();
      }

      // If confirmation required
      if (this.confirmPassword)
      {
        console.log('Confirm password:');

        let confirmation: string | null;
        const confirmSimulated = getNextSimulatedInput('input');

        if (confirmSimulated)
        {
          confirmation = confirmSimulated.value;
          console.log('> ********');
        }
        else
        {
          confirmation = prompt('>');
        }

        if (confirmation === null)
        {
          return { success: true, data: null };
        }

        if (confirmation !== password)
        {
          console.warn('Passwords do not match');
          // Recurse to try again
          return await this.performOperation();
        }
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
