import { assertEquals } from '@std/assert';
import { SubLoggerManager } from '../../../logger/SubLoggerManager.ts';
import { initUserInputQueue } from '../../../runtime/UserInputQueue.ts';
import { captureOutput, normalizeOutput, readFixture } from '../test-helpers.ts';
import { ShowInfoOp } from './ShowInfoOp.ts';

Deno.test('ShowInfoOp with simulated acknowledgment', async () =>
{
  const output = await captureOutput(async () =>
  {
    initUserInputQueue('confirm:yes');
    const op = new ShowInfoOp(
      '📚 Example Information',
      [
        'This is a demonstration of ShowInfoOp.',
        '',
        'Key features:',
        '• Displays information to the user',
        '• Waits for acknowledgment',
        '• Can be boxed for emphasis',
        '',
        'Press Enter to continue...',
      ],
      true,
    );
    const result = await op.run();

    assertEquals(result.success, true);
    if (result.success)
    {
      assertEquals(result.data, undefined);
    }

    console.log('\nRESULT:', JSON.stringify(result));
  });

  const expected = await readFixture('ShowInfoOp');
  assertEquals(normalizeOutput(output), normalizeOutput(expected));
});

Deno.test.beforeAll(() =>
{
  SubLoggerManager.initialize({ suppressSignalHandlers: true });
});
