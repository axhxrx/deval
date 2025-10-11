import { assertEquals } from '@std/assert';
import { SubLoggerManager } from '../../../logger/SubLoggerManager.ts';
import { initUserInputQueue } from '../../../runtime/UserInputQueue.ts';
import { captureOutput, normalizeOutput, readFixture } from '../test-helpers.ts';
import { InputTextOp } from './InputTextOp.ts';

Deno.test('InputTextOp with simulated input', async () =>
{
  const output = await captureOutput(async () =>
  {
    initUserInputQueue('input:"Alice Wonderland"');
    const op = new InputTextOp(
      `Hello!

This is an example of InputTextOp. Please enter your name, or, if you are not comfortable sharing your real name, please enter somebody else's name.

If you don't know any people, you can accept the default name shown below`,
      'Bob Marley',
    );
    const result = await op.run();

    assertEquals(result.success, true);
    if (result.success)
    {
      assertEquals(result.data, 'Alice Wonderland');
    }

    console.log('\nRESULT:', JSON.stringify(result));
  });

  const expected = await readFixture('InputTextOp');
  assertEquals(normalizeOutput(output), normalizeOutput(expected));
});

Deno.test('InputTextOp with validation failure and retry', async () =>
{
  const output = await captureOutput(async () =>
  {
    // First input too short, second input valid
    initUserInputQueue('input:"ab",input:"valid"');
    const op = new InputTextOp(
      'Enter at least 5 characters',
      undefined,
      { minLength: 5 },
    );
    const result = await op.run();

    assertEquals(result.success, true);
    if (result.success)
    {
      assertEquals(result.data, 'valid');
    }
  });

  // Check that validation warning was shown
  assertEquals(output.includes('Minimum length is 5 characters'), true);
});

Deno.test('InputTextOp with cancellation', async () =>
{
  const output = await captureOutput(async () =>
  {
    // Simulate null input (user pressed Esc/Cancel)
    initUserInputQueue('input:""'); // Empty string will be treated as cancellation when no default
    const op = new InputTextOp('Enter text', undefined, { required: false });
    const result = await op.run();

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
