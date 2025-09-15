import { assertEquals } from '@std/assert';
import { SubLoggerManager } from '../../../logger/SubLoggerManager.ts';
import { initUserInputQueue } from '../../../runtime/UserInputQueue.ts';
import { captureOutput, normalizeOutput, readFixture } from '../test-helpers.ts';
import { InputPasswordOperation } from './InputPasswordOperation.ts';

Deno.test('InputPasswordOperation with confirmation', async () =>
{
  const output = await captureOutput(async () =>
  {
    initUserInputQueue('input:"secretpass123",input:"secretpass123"');
    const op = new InputPasswordOperation('Create a new password', true);
    const result = await op.execute();

    assertEquals(result.success, true);
    if (result.success)
    {
      assertEquals(result.data, 'secretpass123');
    }

    // Don't log the actual password, log masked version
    console.log('\nRESULT:', JSON.stringify(result.success ? { success: true, data: '********' } : result));
  });

  const expected = await readFixture('InputPasswordOperation');
  assertEquals(normalizeOutput(output), normalizeOutput(expected));
});

Deno.test('InputPasswordOperation with mismatch and retry', async () =>
{
  const output = await captureOutput(async () =>
  {
    // First attempt: passwords don't match
    // Second attempt: passwords match
    initUserInputQueue('input:"password1",input:"password2",input:"goodpass",input:"goodpass"');
    const op = new InputPasswordOperation('Set password', true);
    const result = await op.execute();

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
