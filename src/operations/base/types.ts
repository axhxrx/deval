/**
 Base result types for all operations

 Operations never throw exceptions - they always return a result
 */

/**
 Success result with data
 */
export interface SuccessResult<T>
{
  success: true;
  data: T;
}

/**
 Failure result with error information
 */
export interface FailureResult
{
  success: false;
  error: string;
  details?: unknown;
}

/**
 Combined operation result type
 */
export type OperationResult<T> = SuccessResult<T> | FailureResult;

/**
 Result type for operations that don't return data
 */
export type VoidResult = OperationResult<void>;

/**
 Operation interface that all operations must implement
 */
export interface Operation<T>
{
  /**
   Name of the operation for logging and identification
   */
  readonly name: string;

  /**
   Execute the operation and return a result

   This method should never throw exceptions
   */
  execute(): Promise<OperationResult<T>>;
}

/**
 Type guard to check if a result is successful
 */
export function isSuccess<T>(result: OperationResult<T>): result is SuccessResult<T>
{
  return result.success === true;
}

/**
 Type guard to check if a result is a failure
 */
export function isFailure<T>(result: OperationResult<T>): result is FailureResult
{
  return result.success === false;
}
