import type { BaseOperation } from './BaseOperation.ts';

/**
 Type guard to check if a value is an operation

 Operations must have an execute() method that returns a Promise
 */
export function isOperation(value: unknown): value is BaseOperation<unknown>
{
  return (
    value !== null
    && value !== undefined
    && typeof value === 'object'
    && 'execute' in value
    && typeof (value as Record<string, unknown>).execute === 'function'
    && 'name' in value
    && typeof (value as Record<string, unknown>).name === 'string'
  );
}
