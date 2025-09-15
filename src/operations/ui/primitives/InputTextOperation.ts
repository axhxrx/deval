import { unifiedPrompt } from '../../../runtime/prompts/unifiedPrompt.ts';
import { UserInputType } from '../../../runtime/types.ts';
import type { OperationResult } from '../../base/types.ts';
import { UIOperation } from '../../base/UIOperation.ts';

/**
Input validation options
*/
export interface InputValidation
{
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  numeric?: boolean;
  required?: boolean;
  validator?: (value: string) => boolean | string; // Return true or error message
}

/**
Text input operation with validation

This operation:
- Prompts for text input
- Validates according to specified rules
- Returns validated string or null on cancellation
- Supports simulated input for testing
*/
export class InputTextOperation extends UIOperation<string | null>
{
  constructor(
    private readonly message: string,
    private readonly defaultValue?: string,
    private readonly validation?: InputValidation,
  )
  {
    super(`Input text: ${message}`);
  }

  protected async performOperation(): Promise<OperationResult<string | null>>
  {
    try
    {
      const value = await unifiedPrompt<string>({
        message: this.message,
        inputType: UserInputType.Input,
        interactive: () =>
        {
          // In real implementation, we'd use a proper input prompt
          // For now, using basic prompt
          const input = prompt(
            this.defaultValue
              ? `${this.message} (default: ${this.defaultValue}): `
              : `${this.message}: `,
          );

          if (input === null)
          {
            // User cancelled
            return null as any;
          }

          // Use default if empty input
          const result = input || this.defaultValue || '';

          // Validate
          const validationError = this.validate(result);
          if (validationError)
          {
            console.error(`❌ ${validationError}`);
            // In real app, we'd retry - for now just return null
            return null as any;
          }

          return result;
        },
      });

      // Validate the value (even from queue)
      if (value !== null)
      {
        const validationError = this.validate(value);
        if (validationError)
        {
          return {
            success: false,
            error: validationError,
          };
        }
      }

      return { success: true, data: value };
    }
    catch (error: unknown)
    {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during text input',
      };
    }
  }

  private validate(value: string): string | null
  {
    if (!this.validation)
    {
      return null;
    }

    const v = this.validation;

    // Required check
    if (v.required && !value)
    {
      return 'This field is required';
    }

    // Length checks
    if (v.minLength && value.length < v.minLength)
    {
      return `Minimum length is ${v.minLength} characters`;
    }

    if (v.maxLength && value.length > v.maxLength)
    {
      return `Maximum length is ${v.maxLength} characters`;
    }

    // Numeric check
    if (v.numeric && !/^\d+$/.test(value))
    {
      return 'Only numeric characters are allowed';
    }

    // Pattern check
    if (v.pattern && !v.pattern.test(value))
    {
      return 'Invalid format';
    }

    // Custom validator
    if (v.validator)
    {
      const result = v.validator(value);
      if (result !== true)
      {
        return typeof result === 'string' ? result : 'Validation failed';
      }
    }

    return null;
  }
}

if (import.meta.main)
{
  const example = new InputTextOperation(
    `Hello!

This is an example of InputTextOperation. Please enter your name, or, if you are not comfortable sharing your real name, please enter somebody else's name.

If you don't know any people, you can accept the default name shown below`,
    'Bob Marley',
  );

  const result = await example.execute();
  console.log('\nRESULT:', result);
}
