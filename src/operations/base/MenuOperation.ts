import { BaseOperation } from './BaseOperation.ts';
import type { OperationResult } from './types.ts';

/**
 Base class for menu operations

 Menu operations are special operations that:
 - Present choices to the user
 - Return other operations to execute (or null for cancel/back)
 - Are short-lived (show menu, get choice, return immediately)
 - Handle cancellation as success with null data

 @template T The type of operation this menu can return (or null)
 */
export abstract class MenuOperation<T extends BaseOperation<unknown> | null> extends BaseOperation<T>
{
  /**
   Whether this menu operation should create its own logger

   By default, menu operations use their parent's logger since they're short-lived
   */
  protected override shouldUseParentLogger(): boolean
  {
    // Menu operations typically use parent's logger unless overridden
    return BaseOperation.parent !== null;
  }

  /**
   Standard method for handling menu cancellation

   Returns success with null data to indicate the user chose to go back/cancel
   */
  protected handleCancellation(message = '  ❌ Cancelled'): OperationResult<T>
  {
    this.logger.info(`\n${message}`);
    return { success: true, data: null as T };
  }
}
