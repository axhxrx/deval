import { assertEquals } from '@std/assert';
import { SubLoggerManager } from '../../../logger/SubLoggerManager.ts';
import { initUserInputQueue } from '../../../runtime/UserInputQueue.ts';
import { captureOutput, normalizeOutput, readFixture } from '../test-helpers.ts';
import { InputPasswordOp } from './InputPasswordOp.ts';

Deno.test('InputPasswordOp with confirmation', async () =>
{
  const output = await captureOutput(async () =>
  {
    initUserInputQueue('input:"secretpass123",input:"secretpass123"');
    const op = new InputPasswordOp('Create a new password', true);
    const result = await op.run();

    assertEquals(result.success, true);
    if (result.success)
    {
      assertEquals(result.data, 'secretpass123');
    }

    // Don't log the actual password, log masked version
    console.log('\nRESULT:', JSON.stringify(result.success ? { success: true, data: '********' } : result));
  });

  const expected = await readFixture('InputPasswordOp');
  assertEquals(normalizeOutput(output), normalizeOutput(expected));
});

Deno.test('InputPasswordOp with mismatch and retry', async () =>
{
  const output = await captureOutput(async () =>
  {
    // First attempt: passwords don't match
    // Second attempt: passwords match
    initUserInputQueue('input:"password1",input:"password2",input:"goodpass",input:"goodpass"');
    const op = new InputPasswordOp('Set password', true);
    const result = await op.run();

    assertEquals(result.success, true);
    if (result.success)
    {
      assertEquals(result.data, 'goodpass');
    }
  });

  // Check that mismatch warning was shown
  assertEquals(output.includes('Passwords do not match'), true);
});

Deno.test.beforeAll(() =>
{
  SubLoggerManager.initialize({ suppressSignalHandlers: true });
});
