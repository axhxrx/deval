import { assertEquals } from '@std/assert';
import { SubLoggerManager } from '../../../logger/SubLoggerManager.ts';
import { initUserInputQueue } from '../../../runtime/UserInputQueue.ts';
import { captureOutput, normalizeOutput, readFixture } from '../test-helpers.ts';
import { InputTextOperation } from './InputTextOperation.ts';

Deno.test('InputTextOperation with simulated input', async () =>
{
  const output = await captureOutput(async () =>
  {
    initUserInputQueue('input:"Alice Wonderland"');
    const op = new InputTextOperation(
      `Hello!

This is an example of InputTextOperation. Please enter your name, or, if you are not comfortable sharing your real name, please enter somebody else's name.

If you don't know any people, you can accept the default name shown below`,
      'Bob Marley',
    );
    const result = await op.execute();

    assertEquals(result.success, true);
    if (result.success)
    {
      assertEquals(result.data, 'Alice Wonderland');
    }

    console.log('\nRESULT:', JSON.stringify(result));
  });

  const expected = await readFixture('InputTextOperation');
  assertEquals(normalizeOutput(output), normalizeOutput(expected));
});

Deno.test('InputTextOperation with validation failure and retry', async () =>
{
  const output = await captureOutput(async () =>
  {
    // First input too short, second input valid
    initUserInputQueue('input:"ab",input:"valid"');
    const op = new InputTextOperation(
      'Enter at least 5 characters',
      undefined,
      { minLength: 5 },
    );
    const result = await op.execute();

    assertEquals(result.success, true);
    if (result.success)
    {
      assertEquals(result.data, 'valid');
    }
  });

  // Check that validation warning was shown
  assertEquals(output.includes('Minimum length is 5 characters'), true);
});

Deno.test('InputTextOperation with cancellation', async () =>
{
  const output = await captureOutput(async () =>
  {
    // Simulate null input (user pressed Esc/Cancel)
    initUserInputQueue('input:""'); // Empty string will be treated as cancellation when no default
    const op = new InputTextOperation('Enter text', undefined, { required: false });
    const result = await op.execute();

    assertEquals(result.success, true);
    if (result.success)
    {
      assertEquals(result.data, '');
    }
  });

  assertEquals(normalizeOutput(output).includes('Enter text'), true);
});

Deno.test.beforeAll(() =>
{
  SubLoggerManager.initialize({ suppressSignalHandlers: true });
});
