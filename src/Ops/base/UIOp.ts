import { BaseOp } from './BaseOp.ts';

/**
 Base class for all UI Ops (prompts, selections, displays)

 UI Ops typically:
 - Share their parent's logger (if one exists)
 - Are short-lived
 - Return user input or null on cancellation
 */
export abstract class UIOp<T> extends BaseOp<T>
{
  /**
   UI Ops share their parent's logger by default
   This keeps the log output clean and sequential
   */
  protected override shouldUseParentLogger(): boolean
  {
    return BaseOp.parent !== null;
  }
}
