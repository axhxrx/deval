import { assertNever } from '@axhxrx/assert-never';
import { parseCliArgs } from '../cli/parser.ts';
import { Logger } from '../logger/logger.ts';
import type {
  SimulatedUserInput,
  SimulatedUserInputTypeMap,
  UserInputType,
} from './types.ts';

/**
Queue for managing simulated user inputs

Allows CLI tools to be driven programmatically for testing and automation
*/
export class UserInputQueue
{
  private queue: SimulatedUserInput[] = [];
  private used: SimulatedUserInput[] = [];
  private originalQueue: SimulatedUserInput[] = [];
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
  private parseInputString(input: string): SimulatedUserInput[]
  {
    const actions: SimulatedUserInput[] = [];
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
            actions.push({ type: 'select', value: num });
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
          actions.push({ type: 'input', value });
          break;
        }
        case 'toggle':
        {
          const value = valueStr.toLowerCase() === 'yes'
            || valueStr.toLowerCase() === 'true'
            || valueStr.toLowerCase() === 'on';
          actions.push({ type: 'toggle', value });
          break;
        }
        case 'confirm':
        {
          // Pass the string value through - let the operation handle parsing
          // This allows for "yes", "no", "more_info", etc.
          if (valueStr === 'yes' || valueStr === 'no' || valueStr === 'help')
          {
            actions.push({ type: 'confirm', value: valueStr });
          }
          else
          {
            throw new Error(`UserInputQueue: Invalid confirm value: ${valueStr}`);
          }
          break;
        }
        default:
          throw new Error(`UserInputQueue: Invalid input type: ${type}`);
      }
    }

    return actions;
  }

  /**
  Get next input of specific type,

  @throws Error if type is not the type of the next simulated input — that indicates the simulated input value is incorrect, so its a fatal error.
  */

  getNext<T extends UserInputType>(type: T): SimulatedUserInputTypeMap[T] | null
  {
    const queued = this.queue.shift();
    if (!queued)
    {
      return null;
    }

    this.used.push(queued);

    this.interactionCount++;

    if (queued.type !== type)
    {
      throw new Error(`Expected ${type} input, but got ${queued.type}`);
    }

    return queued as SimulatedUserInputTypeMap[T];
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
      const type = input.type;
      switch (type)
      {
        case 'select':
          return `select option ${input.value}`;
        case 'input':
          return `input '${input.value}'`;
        case 'toggle':
          return `toggle ${input.value ? 'yes' : 'no'}`;
        case 'confirm':
          return `confirm ${input.value ? 'yes' : 'no'}`;
        default:
          assertNever(type);
          throw new Error(`Unexpected type: ${type}`);
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
Get the global user input queue. This will create the queue if it doesn't exist, using the program arguments. (This is so that operations run as standalone programs can be tested with simulated input.

#deprecated — remove this and just use getNextSimulatedInput() in operations
*/
export function getUserInputQueue(): UserInputQueue | undefined
{
  if (!globalQueue)
  {
    const args = parseCliArgs();
    initUserInputQueue(args.inputs);
  }
  return globalQueue;
}

/**
 Returns the next simulated user input, or null if none exists. Note this throws if the next simulated user input does exist, but is a different type — that implies your simulated input is FUBAR.
 */
export function getNextSimulatedInput<T extends UserInputType>(type: T)
{
  if (!globalQueue)
  {
    const args = parseCliArgs();
    initUserInputQueue(args.inputs);
  }
  if (!globalQueue?.hasMore())
  {
    return null;
  }
  const result = globalQueue.getNext(type);
  return result;
}
