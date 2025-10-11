import { BaseOp } from './BaseOp.ts';
import type { Outcome } from './types.ts';

/**
 Base class for menu Ops

 Menu Ops are special Ops that:
 - Present choices to the user
 - Return other Ops to run (or null for cancel/back)
 - Are short-lived (show menu, get choice, return immediately)
 - Handle cancellation as success with null data

 @template T The type of Op this menu can return (or null)
 */
export abstract class MenuOp<T extends BaseOp<unknown> | null> extends BaseOp<T>
{
  /**
   Whether this menu Op should create its own logger

   By default, menu Ops use their parent's logger since they're short-lived
   */
  protected override shouldUseParentLogger(): boolean
  {
    // Menu Ops typically use parent's logger unless overridden
    return BaseOp.parent !== null;
  }

  /**
   Standard method for handling menu cancellation

   Returns success with null data to indicate the user chose to go back/cancel
   */
  protected handleCancellation(message = '  ❌ Cancelled'): Outcome<T>
  {
    this.logger.info(`\n${message}`);
    return { success: true, data: null as T };
  }
}
