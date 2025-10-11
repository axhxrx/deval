import { assertEquals } from '@std/assert';
import { SubLoggerManager } from '../../../logger/SubLoggerManager.ts';
import { initUserInputQueue } from '../../../runtime/UserInputQueue.ts';
import { captureOutput, normalizeOutput, readFixture } from '../test-helpers.ts';
import { SelectOp } from './SelectOp.ts';

Deno.test('SelectOp with simulated input', async () =>
{
  const colors = ['Red', 'Green', 'Blue', 'Yellow'] as const;

  const output = await captureOutput(async () =>
  {
    initUserInputQueue('select:2');
    const op = new SelectOp('What is your favorite color?', colors, true);
    const result = await op.run();

    assertEquals(result.success, true);
    if (result.success)
    {
      assertEquals(result.data, 'Blue');
    }

    console.log('\nRESULT:', JSON.stringify(result));
  });

  const expected = await readFixture('SelectOp');
  assertEquals(normalizeOutput(output), normalizeOutput(expected));
});

Deno.test('SelectOp with cancellation', async () =>
{
  const options = ['Option A', 'Option B'] as const;

  const output = await captureOutput(async () =>
  {
    initUserInputQueue('select:99'); // Invalid index = cancellation
    const op = new SelectOp('Choose an option', options, true);
    const result = await op.run();

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
