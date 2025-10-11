/**
 Base result types for all Ops

 Ops never throw exceptions - they always return a result
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
 Combined Op result type
 */
export type Outcome<T> = SuccessResult<T> | FailureResult;

/**
 Result type for Ops that don't return data
 */
export type VoidResult = Outcome<void>;

/**
 Op interface that all Ops must implement
 */
export interface Op<T>
{
  /**
   Name of the Op for logging and identification
   */
  readonly name: string;

  /**
   Run the Op and return a result

   This method should never throw exceptions
   */
  run(): Promise<Outcome<T>>;
}

/**
 Type guard to check if a result is successful
 */
export function isSuccess<T>(result: Outcome<T>): result is SuccessResult<T>
{
  return result.success === true;
}

/**
 Type guard to check if a result is a failure
 */
export function isFailure<T>(result: Outcome<T>): result is FailureResult
{
  return result.success === false;
}
