/**
Test utilities for UI operations testing
*/

/**
Captures console output during an async operation

Returns the captured output as a string
*/
export async function captureOutput(fn: () => Promise<void>): Promise<string>
{
  const originalLog = console.log;
  const originalError = console.error;
  const output: string[] = [];

  // Override console methods
  console.log = (...args: unknown[]) =>
  {
    output.push(args.map(String).join(' '));
  };
  console.error = (...args: unknown[]) =>
  {
    output.push('[ERROR] ' + args.map(String).join(' '));
  };

  try
  {
    await fn();
  }
  finally
  {
    // Restore original console methods
    console.log = originalLog;
    console.error = originalError;
  }

  return output.join('\n');
}

/**
Fuzzy string matching for non-brittle tests

Supports patterns like:
- Wildcards: "foo*bar" matches "foo anything bar"
- Optional sections: "foo[?optional]bar" matches "foobar" or "foooptionalbar"
- Flexible whitespace: multiple spaces/tabs treated as one
*/
export function fuzzyMatch(actual: string, pattern: string): boolean
{
  // Normalize whitespace
  const normalizedActual = actual.replace(/\s+/g, ' ').trim();
  const normalizedPattern = pattern.replace(/\s+/g, ' ').trim();

  // Convert pattern to regex
  let regexPattern = normalizedPattern
    // Escape special regex characters
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Support * as wildcard
    .replace(/\\\*/g, '.*')
    // Support [?...] as optional
    .replace(/\\\[\\\?([^\]]+)\\\]/g, '(?:$1)?');

  try
  {
    const regex = new RegExp(regexPattern, 'i');
    return regex.test(normalizedActual);
  }
  catch
  {
    // If regex is invalid, fall back to simple includes
    return normalizedActual.toLowerCase().includes(normalizedPattern.toLowerCase());
  }
}

/**
Runs an operation with simulated inputs
*/
export async function withSimulatedInputs<T>(
  inputs: string,
  fn: () => Promise<T>,
): Promise<T>
{
  // This would integrate with UserInputQueue
  // For now, we'll import and use it directly in tests
  const { initUserInputQueue } = await import('../runtime/UserInputQueue.ts');

  initUserInputQueue(inputs);

  try
  {
    return await fn();
  }
  finally
  {
    // Clear the queue after test
    initUserInputQueue(undefined);
  }
}

/**
Asserts that output contains expected text (fuzzy match)
*/
export function assertOutputContains(actual: string, expected: string): void
{
  if (!fuzzyMatch(actual, expected))
  {
    throw new Error(
      `Output does not contain expected text:\nExpected pattern: ${expected}\nActual output:\n${actual}`,
    );
  }
}

/**
Asserts that output does NOT contain text
*/
export function assertOutputNotContains(actual: string, notExpected: string): void
{
  if (fuzzyMatch(actual, notExpected))
  {
    throw new Error(
      `Output unexpectedly contains text:\nNot expected: ${notExpected}\nActual output:\n${actual}`,
    );
  }
}
