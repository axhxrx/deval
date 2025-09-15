import type { OperationResult } from '../../base/types.ts';
import { UIOperation } from '../../base/UIOperation.ts';
import { InputTextOperation, type InputValidation } from './InputTextOperation.ts';
import { SelectOperation } from './SelectOperation.ts';

/**
Configuration for a single text field
*/
export interface TextFieldConfig
{
  /**
  Unique key for this field in the result object
  */
  key: string;

  /**
  Prompt message for this field
  */
  message: string;

  /**
  Default value if user doesn't enter anything
  */
  defaultValue?: string;

  /**
  Validation rules for this field
  */
  validation?: InputValidation;

  /**
  Whether this field is required (shortcut for validation.required)
  */
  required?: boolean;
}

/**
Result type for multiple text inputs
*/
export type MultipleTextResult = Record<string, string>;

/**
Operation for collecting multiple text inputs with back navigation support

This operation:
- Collects multiple text inputs in sequence
- Shows previously entered values in context
- Supports back navigation to edit previous fields
- Returns object with all collected values or null on cancellation
*/
export class InputMultipleTextOperation extends UIOperation<MultipleTextResult | null>
{
  private fields: TextFieldConfig[];

  constructor(
    private readonly title: string,
    fields: TextFieldConfig[] | TextFieldConfig,
  )
  {
    super(`Input multiple: ${title}`);
    this.fields = Array.isArray(fields) ? fields : [fields];
  }

  protected async performOperation(): Promise<OperationResult<MultipleTextResult | null>>
  {
    try
    {
      const results: MultipleTextResult = {};
      let currentIndex = 0;

      console.log(`\n${this.title}`);
      console.log('═'.repeat(Math.min(this.title.length, 60)));

      while (currentIndex < this.fields.length)
      {
        const field = this.fields[currentIndex];

        // Show previously entered values if any
        if (currentIndex > 0)
        {
          console.log('\nEntered so far:');
          for (let i = 0; i < currentIndex; i++)
          {
            const prevField = this.fields[i];
            console.log(`  ${prevField.key}: ${results[prevField.key]}`);
          }
        }

        // Prompt for current field
        const validation = field.validation || (field.required ? { required: true } : undefined);
        const inputOp = new InputTextOperation(
          `\n${field.message}`,
          results[field.key] || field.defaultValue, // Use existing value if going back
          validation,
        );

        const result = await inputOp.execute();

        if (!result.success)
        {
          // Input operation failed
          return {
            success: false,
            error: `Failed to get ${field.key}: ${result.error}`,
          };
        }

        const value = result.data;

        // Check if user wants to go back (empty input with no default)
        if (value === null)
        {
          if (currentIndex > 0)
          {
            // Ask if they want to go back
            const choices = ['↩️  Go back to previous field', '❌ Cancel entire form'] as const;
            const navOp = new SelectOperation('What would you like to do?', choices, false);
            const navResult = await navOp.execute();

            if (!navResult.success || !navResult.data)
            {
              return { success: true, data: null };
            }

            if (navResult.data.includes('Go back'))
            {
              currentIndex--;
              continue;
            }
            else
            {
              // Cancel entire form
              return { success: true, data: null };
            }
          }
          else
          {
            // Can't go back from first field, treat as cancel
            return { success: true, data: null };
          }
        }

        // Store the result and move to next field
        results[field.key] = value!;
        currentIndex++;
      }

      // Show final summary
      console.log('\n✅ All fields collected:');
      for (const field of this.fields)
      {
        console.log(`  ${field.key}: ${results[field.key]}`);
      }

      return { success: true, data: results };
    }
    catch (error: unknown)
    {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during multiple input',
      };
    }
  }
}

// Make it runnable as a standalone program
if (import.meta.main)
{
  const example = new InputMultipleTextOperation(
    '📝 Example Multi-Field Form',
    [
      {
        key: 'name',
        message: 'What is your name?',
        defaultValue: 'Anonymous',
        required: true,
      },
      {
        key: 'email',
        message: 'What is your email address?',
        validation: {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
      },
      {
        key: 'age',
        message: 'How old are you?',
        validation: {
          numeric: true,
          minLength: 1,
          maxLength: 3,
        },
      },
      {
        key: 'location',
        message: 'Where are you located?',
        defaultValue: 'Earth',
      },
    ],
  );

  const result = await example.execute();
  console.log('\nFINAL RESULT:', JSON.stringify(result, null, 2));
}
