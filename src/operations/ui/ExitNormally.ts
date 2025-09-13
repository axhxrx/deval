import process from 'node:process';
import { BaseOperation } from '../base/BaseOperation.ts';
import type { OperationResult } from '../base/types.ts';

export class ExitNormally extends BaseOperation<void>
{
  constructor(private message?: string)
  {
    super('Exit normally');
  }

  protected async performOperation(): Promise<OperationResult<void>>
  {
    await Promise.resolve();

    if (this.message)
    {
      console.log(this.message);
    }

    process.exit(0);

    // will never be reached
    return { success: true, data: undefined };
  }
}
