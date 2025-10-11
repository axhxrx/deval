import { getNextSimulatedInput } from '../../../runtime/UserInputQueue.ts';
import type { Outcome } from '../../base/types.ts';
import { UIOp } from '../../base/UIOp.ts';

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
Text input Op with validation

This Op:
- Prompts for text input
- Validates according to specified rules
- Returns validated string or null on cancellation
- Supports simulated input for testing
*/
export class InputTextOp extends UIOp<string | null>
{
  constructor(
    private readonly message: string,
    private readonly defaultValue?: string,
    private readonly validation?: InputValidation,
  )
  {
    super(`Input text: ${message}`);
  }

  protected async performOp(): Promise<Outcome<string | null>>
  {
    try
    {
      const message = this.defaultValue
        ? `${this.message} (default: ${this.defaultValue}):`
        : `${this.message}:`;

      console.log(message);

      const simulatedInput = getNextSimulatedInput('input');

      let enteredValue: string | null;

      if (simulatedInput)
      {
        // Simulated input - print it as if typed
        enteredValue = simulatedInput.value;
        console.log(`> ${enteredValue}`);
      }
      else
      {
        // Interactive input
        enteredValue = prompt('>');
      }

      const value = this.defaultValue
        ? enteredValue || this.defaultValue
        : enteredValue;

      // Only validate if value is not null — null means the user cancelled the input
      if (value !== null)
      {
        // Validate the value (even from queue)
        const validationError = this.validate(value);
        if (validationError)
        {
          // If we have a validation error, inform the user and re-run the Op recursively.
          console.warn(validationError);
          const result = await this.performOp();
          return result;
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

  private validate(value: unknown)
  {
    if (!this.validation)
    {
      return null;
    }

    if (typeof value !== 'string')
    {
      return `Invalid input type (got ${typeof value} (${value}), but string is required)`;
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
  const example = new InputTextOp(
    `Hello!

This is an example of InputTextOp. Please enter your name, or, if you are not comfortable sharing your real name, please enter somebody else's name.

If you don't know any people, you can accept the default name shown below`,
    'Bob Marley',
  );

  const result = await example.run();
  console.log('\nRESULT:', result);
}
