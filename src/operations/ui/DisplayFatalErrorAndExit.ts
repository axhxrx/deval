import process from 'node:process';
import { BaseOperation } from '../base/BaseOperation.ts';
import type { OperationResult } from '../base/types.ts';

export class DisplayFatalErrorAndExit extends BaseOperation<void>
{
  constructor(private error?: Error | string)
  {
    super('Display fatal error and exit');
  }

  protected async performOperation(): Promise<OperationResult<void>>
  {
    await Promise.resolve();

    this.logger.error('Fatal error occurred');
    this.logger.error(`${this.error}`);

    console.error('Fatal error occurred');
    console.error(this.error);
    process.exit(1);

    // will never be reached
    return { success: true, data: undefined };
  }
}
