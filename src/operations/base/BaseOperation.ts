import { Logger, type LoggerSuspensionMetadata } from '../../logger/logger.ts';
import type { Operation, OperationResult } from './types.ts';

class OperationIdGenerator
{
  private static _operationNumber = 0;

  static next(): number
  {
    return ++this._operationNumber;
  }
}

export function formatOperationResultForLogging(
  result: OperationResult<unknown>,
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
 Abstract base class for all operations

 Provides common functionality:
 - Automatic sub-logger creation with smart parent/child sharing
 - Exception handling
 - Consistent logging pattern

 Logging behavior:
 - By default, child operations share their parent's logger
 - Top-level operations (no parent) create their own logger
 - Override shouldUseParentLogger() to force own logger creation
 */
export abstract class BaseOperation<T> implements Operation<T>
{
  // Global operation stack for tracking hierarchy
  private static operationStack: BaseOperation<unknown>[] = [];

  // Public getter for the current operation stack
  static get currentStack(): ReadonlyArray<BaseOperation<unknown>>
  {
    return [...this.operationStack];
  }

  // Get the immediate parent operation (if any)
  static get parent(): BaseOperation<unknown> | null
  {
    return this.operationStack.length > 1
      ? this.operationStack[this.operationStack.length - 2]
      : null;
  }

  // FIXME!! Type inference naw work
  static async execute<ResultT, ThisT extends typeof BaseOperation<ResultT>>(
    this: ThisT,
    ...args: ConstructorParameters<ThisT>
  ): Promise<OperationResult<ResultT>>
  {
    // deno-lint-ignore no-explicit-any
    const op = new (this as unknown as any)(...args);
    const result = await op.execute();
    return result;
  }

  private _operationId: number = OperationIdGenerator.next();

  get operationId(): number
  {
    return this._operationId;
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
    const parent = BaseOperation.parent;
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
   Determines whether this operation should use its parent's logger

   Override this method in subclasses to control logger inheritance.
   Default: true if parent exists (share parent's logger)

   Operations that need their own log file should override this to return false.
   */
  protected shouldUseParentLogger(): boolean
  {
    // Default: use parent's logger if we have a parent
    return BaseOperation.parent !== null;
  }

  constructor(public readonly name: string)
  {
    // Logger is now created lazily on first use
  }

  /**
   Execute the operation with automatic logging and error handling
   */
  async execute(): Promise<OperationResult<T>>
  {
    // Add ourselves to the operation stack
    BaseOperation.operationStack.push(this);

    try
    {
      // Check if we need to suspend parent's logger before we start
      await this.handleParentLoggerSuspension();

      this.logger.debug(`Starting operation ${this.operationId}: ${this.name}`);

      // Perform the actual operation
      const result = await this.performOperation();

      // Log the outcome
      if (result.success)
      {
        this.logger.debug(
          `Operation ${this.operationId}: ${this.name} completed successfully`,
        );
      }
      else
      {
        this.logger.error(
          `Operation ${this.operationId}: ${this.name} failed`,
          undefined,
          {
            error: result.error,
          },
        );
      }

      const formattedResult = formatOperationResultForLogging(result);

      this.logger.debug(`Operation ${this.operationId}: ${formattedResult}`);

      // Only finalize if we created our own logger (not using parent's)
      if (this._logger && !this._usingParentLogger)
      {
        await this._logger.finalize();
      }

      return result;
    }
    catch (error: unknown)
    {
      // Handle any unexpected errors that weren't caught by performOperation
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('Unexpected error in operation', error);

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

      // Remove ourselves from the operation stack
      BaseOperation.operationStack.pop();
    }
  }

  /**
   Handle suspension of parent's logger if needed
   */
  private async handleParentLoggerSuspension(): Promise<void>
  {
    const parent = BaseOperation.parent;

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
      const parent = BaseOperation.parent;
      if (parent)
      {
        // Resume parent's logger with a new part
        parent._logger = Logger.resumeFrom(this._suspensionMetadata);

        // Log that we're resuming
        parent._logger.info('[RESUMING AFTER CHILD OPERATION]');
      }
    }
  }

  /**
   Force finalization of this operation's logger if it owns one

   This is needed for operations that call Deno.exit() to ensure logs are written to disk
   */
  protected async finalizeOwnLogger(): Promise<void>
  {
    if (this._logger && !this._usingParentLogger)
    {
      await this._logger.finalize();
    }
  }

  /**
   Subclasses must implement this method to perform the actual operation

   This method should catch expected errors and return appropriate results

   Unexpected errors will be caught by execute(), after which the perpetrator will be flogged!
   */
  protected abstract performOperation(): Promise<OperationResult<T>>;
}
