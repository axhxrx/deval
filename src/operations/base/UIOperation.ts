import { BaseOperation } from './BaseOperation.ts';

/**
 Base class for all UI operations (prompts, selections, displays)

 UI operations typically:
 - Share their parent's logger (if one exists)
 - Are short-lived
 - Return user input or null on cancellation
 */
export abstract class UIOperation<T> extends BaseOperation<T>
{
  /**
   UI operations share their parent's logger by default
   This keeps the log output clean and sequential
   */
  protected override shouldUseParentLogger(): boolean
  {
    return BaseOperation.parent !== null;
  }
}
