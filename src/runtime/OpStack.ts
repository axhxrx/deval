import { Logger } from '../logger/logger.ts';
import type { BaseOp } from '../ops/base/BaseOp.ts';
import { isOp } from '../ops/base/isOp.ts';

/**
Generic Op chain runner

Not specific to deval - can be extracted to a library
*/
export class OpStack
{
  /**
  Run a chain of Ops recursively

  Ops can return other Ops, creating a chain. The chain continues until an Op returns null or non-Op data.

  Ops are responsible for their own UI and error handling. This function only handles catastrophic failures.
  */
  static async run(Op: BaseOp<unknown>): Promise<void>
  {
    try
    {
      const result = await Op.run();

      // Only continue chain if we got another Op
      if (result.success && result.data && isOp(result.data))
      {
        await OpStack.run(result.data);
      }
      // Otherwise done - Op handled everything internally
    }
    catch (error: unknown)
    {
      // Catastrophic failure - log and show error
      await Logger.error('FATAL: Op crashed', error);
      console.error('Op crashed:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
  Run a single Op and return its result

  Useful for CLI commands that map directly to Ops
  */
  static async runSingle<T>(Op: BaseOp<T>)
  {
    return await Op.run();
  }
}
