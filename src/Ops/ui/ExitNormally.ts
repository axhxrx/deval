import process from 'node:process';
import { BaseOp } from '../base/BaseOp.ts';
import type { Outcome } from '../base/types.ts';

export class ExitNormally extends BaseOp<void>
{
  constructor(private message?: string)
  {
    super('Exit normally');
  }

  protected async performOp(): Promise<Outcome<void>>
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
