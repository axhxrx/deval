/**
Shared test helpers for UI Op tests
*/

/**
Capture console output during test execution
*/
export async function captureOutput(fn: () => Promise<void>): Promise<string>
{
  const originalLog = console.log;
  const originalWarn = console.warn;
  const output: string[] = [];

  console.log = (...args: unknown[]) =>
  {
    output.push(args.map(String).join(' '));
  };
  console.warn = (...args: unknown[]) =>
  {
    output.push(args.map(String).join(' '));
  };

  try
  {
    await fn();
  }
  finally
  {
    console.log = originalLog;
    console.warn = originalWarn;
  }

  return output.join('\n');
}

/**
Read fixture file content
*/
export async function readFixture(name: string): Promise<string>
{
  const path = `test/fixture/${name}.fixture.txt`;
  const content = await Deno.readTextFile(path);
  // Normalize line endings and trim
  return content.replace(/\r\n/g, '\n').trim();
}

/**
Normalize output for comparison (remove timestamps, ANSI codes, etc.)
*/
export function normalizeOutput(output: string): string
{
  return output
    // Remove ANSI color codes
    // deno-lint-ignore no-control-regex
    .replace(/\x1b\[[0-9;]*m/g, '')
    // Remove timestamps
    .replace(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/g, '[TIMESTAMP]')
    // Remove logger prefixes
    .replace(/\[TIMESTAMP\] INFO\s+/g, '')
    // Remove extra whitespace
    .trim();
}
