import { assertEquals } from '@std/assert';
import { SubLoggerManager } from '../../../logger/SubLoggerManager.ts';
import { initUserInputQueue } from '../../../runtime/UserInputQueue.ts';
import { captureOutput, normalizeOutput, readFixture } from '../test-helpers.ts';
import { SelectOperation } from './SelectOperation.ts';

Deno.test('SelectOperation with simulated input', async () =>
{
  const colors = ['Red', 'Green', 'Blue', 'Yellow'] as const;

  const output = await captureOutput(async () =>
  {
    initUserInputQueue('select:2');
    const op = new SelectOperation('What is your favorite color?', colors, true);
    const result = await op.execute();

    assertEquals(result.success, true);
    if (result.success)
    {
      assertEquals(result.data, 'Blue');
    }

    console.log('\nRESULT:', JSON.stringify(result));
  });

  const expected = await readFixture('SelectOperation');
  assertEquals(normalizeOutput(output), normalizeOutput(expected));
});

Deno.test('SelectOperation with cancellation', async () =>
{
  const options = ['Option A', 'Option B'] as const;

  const output = await captureOutput(async () =>
  {
    initUserInputQueue('select:99'); // Invalid index = cancellation
    const op = new SelectOperation('Choose an option', options, true);
    const result = await op.execute();

    assertEquals(result.success, true);
    if (result.success)
    {
      assertEquals(result.data, null);
    }
  });

  assertEquals(output.includes('(cancelled)'), true);
});

Deno.test.beforeAll(() =>
{
  SubLoggerManager.initialize({ suppressSignalHandlers: true });
});
