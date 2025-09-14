import { Logger } from '../logger/logger.ts';
import type { UserInput } from './types.ts';
import { UserInputType } from './types.ts';

/**
Queue for managing simulated user inputs

Allows CLI tools to be driven programmatically for testing and automation
*/
export class UserInputQueue
{
  private queue: UserInput[] = [];
  private originalQueue: UserInput[] = [];
  private interactionCount = 0;

  constructor(inputString?: string)
  {
    if (inputString)
    {
      this.queue = this.parseInputString(inputString);
      this.originalQueue = [...this.queue];
      Logger.debug(`Parsed user inputs: ${JSON.stringify(this.queue)}`);
    }
  }

  /**
  Parse input string into queue of actions

  Format: "select:3,input:'text with spaces',toggle:yes,select:7"
  */
  private parseInputString(input: string): UserInput[]
  {
    const actions: UserInput[] = [];
    const parts: string[] = [];

    // Parse respecting quoted strings
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < input.length; i++)
    {
      const char = input[i];

      if ((char === '"' || char === "'") && (i === 0 || input[i - 1] !== '\\'))
      {
        if (!inQuotes)
        {
          inQuotes = true;
          quoteChar = char;
        }
        else if (char === quoteChar)
        {
          inQuotes = false;
          quoteChar = '';
        }
        else
        {
          current += char;
        }
      }
      else if (char === ',' && !inQuotes)
      {
        parts.push(current.trim());
        current = '';
      }
      else
      {
        current += char;
      }
    }

    if (current)
    {
      parts.push(current.trim());
    }

    // Parse each action
    for (const part of parts)
    {
      const colonIndex = part.indexOf(':');
      if (colonIndex === -1) continue;

      const type = part.substring(0, colonIndex).trim();
      const valueStr = part.substring(colonIndex + 1).trim();

      switch (type)
      {
        case 'select':
        {
          const num = parseInt(valueStr, 10);
          if (!isNaN(num))
          {
            actions.push({ type: UserInputType.Select, value: num });
          }
          break;
        }
        case 'input':
        {
          // Remove quotes if present
          let value = valueStr;
          if (
            (value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith("'") && value.endsWith("'"))
          )
          {
            value = value.slice(1, -1);
          }
          actions.push({ type: UserInputType.Input, value });
          break;
        }
        case 'toggle':
        {
          const value = valueStr.toLowerCase() === 'yes'
            || valueStr.toLowerCase() === 'true'
            || valueStr.toLowerCase() === 'on';
          actions.push({ type: UserInputType.Toggle, value });
          break;
        }
        case 'confirm':
        {
          const value = valueStr.toLowerCase() === 'yes'
            || valueStr.toLowerCase() === 'y'
            || valueStr.toLowerCase() === 'true';
          actions.push({ type: UserInputType.Confirm, value });
          break;
        }
        case 'checkbox':
        {
          // Parse array format: checkbox:['option1','option2']
          if (valueStr.startsWith('[') && valueStr.endsWith(']'))
          {
            const arrayContent = valueStr.slice(1, -1);
            const values = arrayContent.split(',').map((v) =>
            {
              let trimmed = v.trim();
              if (
                (trimmed.startsWith('"') && trimmed.endsWith('"'))
                || (trimmed.startsWith("'") && trimmed.endsWith("'"))
              )
              {
                trimmed = trimmed.slice(1, -1);
              }
              return trimmed;
            });
            actions.push({ type: UserInputType.Checkbox, value: values });
          }
          break;
        }
      }
    }

    return actions;
  }

  /**
  Get next input of specific type
  */
  getNext(type: UserInputType): UserInput | undefined
  {
    this.interactionCount++;

    const index = this.queue.findIndex((input) => input.type === type);
    if (index !== -1)
    {
      const input = this.queue.splice(index, 1)[0];
      Logger.info(`[SIMULATED INPUT] ${type} = ${JSON.stringify(input.value)}`);
      return input;
    }
    return undefined;
  }

  /**
  Check if queue has more inputs
  */
  hasMore(): boolean
  {
    return this.queue.length > 0;
  }

  /**
  Get summary of original inputs for logging
  */
  getSummary(): string
  {
    return this.originalQueue.map((input) =>
    {
      switch (input.type)
      {
        case UserInputType.Select:
          return `select option ${input.value}`;
        case UserInputType.Input:
          return `input '${input.value}'`;
        case UserInputType.Toggle:
          return `toggle ${input.value ? 'yes' : 'no'}`;
        case UserInputType.Confirm:
          return `confirm ${input.value ? 'yes' : 'no'}`;
        case UserInputType.Checkbox:
          return `checkbox [${Array.isArray(input.value) ? input.value.join(', ') : input.value}]`;
        default:
          return `${input.type} ${input.value}`;
      }
    }).join(', ');
  }
}

// Global instance
let globalQueue: UserInputQueue | undefined;

/**
Initialize the global user input queue
*/
export function initUserInputQueue(inputString?: string): void
{
  globalQueue = new UserInputQueue(inputString);
  if (inputString)
  {
    Logger.debug(`Initialized user input queue: ${globalQueue.getSummary()}`);
  }
}

/**
Get the global user input queue
*/
export function getUserInputQueue(): UserInputQueue | undefined
{
  return globalQueue;
}
