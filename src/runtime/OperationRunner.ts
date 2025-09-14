import { Logger } from '../logger/logger.ts';
import type { BaseOperation } from '../operations/base/BaseOperation.ts';
import { isOperation } from '../operations/base/isOperation.ts';

/**
Generic operation chain runner

Not specific to deval - can be extracted to a library
*/
export class OperationRunner
{
  /**
  Execute a chain of operations recursively

  Operations can return other operations, creating a chain. The chain continues until an operation returns null or non-operation data.

  Operations are responsible for their own UI and error handling. This function only handles catastrophic failures.
  */
  static async executeChain(operation: BaseOperation<unknown>): Promise<void>
  {
    try
    {
      const result = await operation.execute();

      // Only continue chain if we got another operation
      if (result.success && result.data && isOperation(result.data))
      {
        await OperationRunner.executeChain(result.data);
      }
      // Otherwise done - operation handled everything internally
    }
    catch (error: unknown)
    {
      // Catastrophic failure - log and show error
      await Logger.error('FATAL: Operation crashed', error);
      console.error('Operation crashed:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
  Execute a single operation and return its result

  Useful for CLI commands that map directly to operations
  */
  static async executeSingle<T>(operation: BaseOperation<T>)
  {
    return await operation.execute();
  }
}
