import { Logger, type LoggerSuspensionMetadata } from '../../logger/logger.ts';
import type { Op, Outcome } from './types.ts';

class OpIdGenerator
{
  private static _OpNumber = 0;

  static next(): number
  {
    return ++this._OpNumber;
  }
}

export function formatOutcomeForLogging(
  result: Outcome<unknown>,
): string
{
  if (result.success)
  {
    return `✅ { success: true, data: ${result.data} }`;
  }
  else
  {
    return `❌ { success: false, error: ${result.error}, details: ${result.details} }`;
  }
}

/**
 Abstract base class for all Ops

 Provides common functionality:
 - Automatic sub-logger creation with smart parent/child sharing
 - Exception handling
 - Consistent logging pattern

 Logging behavior:
 - By default, child Ops share their parent's logger
 - Top-level Ops (no parent) create their own logger
 - Override shouldUseParentLogger() to force own logger creation
 */
export abstract class BaseOp<T> implements Op<T>
{
  // Global Op stack for tracking hierarchy
  private static OpStack: BaseOp<unknown>[] = [];

  // Public getter for the current Op stack
  static get currentStack(): ReadonlyArray<BaseOp<unknown>>
  {
    return [...this.OpStack];
  }

  // Get the immediate parent Op (if any)
  static get parent(): BaseOp<unknown> | null
  {
    return this.OpStack.length > 1
      ? this.OpStack[this.OpStack.length - 2]
      : null;
  }

  // FIXME!! Type inference naw work
  static async run<ResultT, ThisT extends typeof BaseOp<ResultT>>(
    this: ThisT,
    ...args: ConstructorParameters<ThisT>
  ): Promise<Outcome<ResultT>>
  {
    // deno-lint-ignore no-explicit-any
    const op = new (this as unknown as any)(...args);
    const result = await op.run();
    return result;
  }

  private _OpId: number = OpIdGenerator.next();

  get OpId(): number
  {
    return this._OpId;
  }

  private _logger: Logger | null = null;
  private _usingParentLogger: boolean = false;
  private _parentLoggerSuspended: boolean = false;
  private _suspensionMetadata: LoggerSuspensionMetadata | null = null;

  protected get logger(): Logger
  {
    // If we already have a logger, return it
    if (this._logger)
    {
      return this._logger;
    }

    // Check if we should use parent's logger
    const parent = BaseOp.parent;
    if (parent && this.shouldUseParentLogger())
    {
      this._usingParentLogger = true;
      // Create a temporary logger to avoid recursion
      // The parent will get its logger independently
      if (!parent._logger)
      {
        // Parent doesn't have a logger yet, create our own
        this._logger = new Logger(this.name);
        this._usingParentLogger = false;
        return this._logger;
      }
      return parent._logger;
    }

    // Create our own logger
    this._logger = new Logger(this.name);
    this._usingParentLogger = false;
    return this._logger;
  }

  /**
   Determines whether this Op should use its parent's logger

   Override this method in subclasses to control logger inheritance.
   Default: true if parent exists (share parent's logger)

   Ops that need their own log file should override this to return false.
   */
  protected shouldUseParentLogger(): boolean
  {
    // Default: use parent's logger if we have a parent
    return BaseOp.parent !== null;
  }

  constructor(public readonly name: string)
  {
    // Logger is now created lazily on first use
  }

  /**
   Run the Op with automatic logging and error handling
   */
  async run(): Promise<Outcome<T>>
  {
    // Add ourselves to the Op stack
    BaseOp.OpStack.push(this);

    try
    {
      // Check if we need to suspend parent's logger before we start
      await this.handleParentLoggerSuspension();

      this.logger.debug(`Starting Op ${this.OpId}: ${this.name}`);

      // Perform the actual Op
      const result = await this.performOp();

      // Log the outcome
      if (result.success)
      {
        this.logger.debug(
          `Op ${this.OpId}: ${this.name} completed successfully`,
        );
      }
      else
      {
        this.logger.error(
          `Op ${this.OpId}: ${this.name} failed`,
          undefined,
          {
            error: result.error,
          },
        );
      }

      const formattedResult = formatOutcomeForLogging(result);

      this.logger.debug(`Op ${this.OpId}: ${formattedResult}`);

      // Only finalize if we created our own logger (not using parent's)
      if (this._logger && !this._usingParentLogger)
      {
        await this._logger.finalize();
      }

      return result;
    }
    catch (error: unknown)
    {
      // Handle any unexpected errors that weren't caught by performOp
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('Unexpected error in Op', error);

      // Only finalize if we created our own logger
      if (this._logger && !this._usingParentLogger)
      {
        await this._logger.finalize();
      }

      return {
        success: false,
        error: errorMessage,
        details: error,
      };
    }
    finally
    {
      // Resume parent's logger if we suspended it (MUST do this before popping stack)
      this.handleParentLoggerResumption();

      // Remove ourselves from the Op stack
      BaseOp.OpStack.pop();
    }
  }

  /**
   Handle suspension of parent's logger if needed
   */
  private async handleParentLoggerSuspension(): Promise<void>
  {
    const parent = BaseOp.parent;

    // Only suspend if:
    // 1. We have a parent
    // 2. We're creating our own logger (not using parent's)
    // 3. Parent has an active logger
    // 4. Parent owns its logger (not using grandparent's)
    if (
      parent
      && !this.shouldUseParentLogger()
      && parent._logger
      && !parent._usingParentLogger
    )
    {
      // Suspend parent's logger
      this._suspensionMetadata = await parent._logger.suspend();
      this._parentLoggerSuspended = true;
      parent._logger = null; // Clear parent's logger reference
    }
  }

  /**
   Resume parent's logger if we suspended it
   */
  private handleParentLoggerResumption(): void
  {
    if (this._parentLoggerSuspended && this._suspensionMetadata)
    {
      const parent = BaseOp.parent;
      if (parent)
      {
        // Resume parent's logger with a new part
        parent._logger = Logger.resumeFrom(this._suspensionMetadata);

        // Log that we're resuming
        parent._logger.info('[RESUMING AFTER CHILD Op]');
      }
    }
  }

  /**
   Force finalization of this Op's logger if it owns one

   This is needed for Ops that call Deno.exit() to ensure logs are written to disk
   */
  protected async finalizeOwnLogger(): Promise<void>
  {
    if (this._logger && !this._usingParentLogger)
    {
      await this._logger.finalize();
    }
  }

  /**
   Subclasses must implement this method to perform the actual Op

   This method should catch expected errors and return appropriate results

   Unexpected errors will be caught by run(), after which the perpetrator will be flogged!
   */
  protected abstract performOp(): Promise<Outcome<T>>;
}
