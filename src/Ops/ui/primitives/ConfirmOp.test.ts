import { assertEquals } from '@std/assert';
import { SubLoggerManager } from '../../../logger/SubLoggerManager.ts';
import { initUserInputQueue } from '../../../runtime/UserInputQueue.ts';
import { captureOutput, normalizeOutput, readFixture } from '../test-helpers.ts';
import { ConfirmOp } from './ConfirmOp.ts';

Deno.test('ConfirmOp with more info flow', async () =>
{
  const output = await captureOutput(async () =>
  {
    initUserInputQueue('confirm:help,confirm:yes,confirm:yes');
    const op = new ConfirmOp(
      'Do you want to proceed with the Op?',
      {
        moreInfo: ['This Op will:', '• Process all files', '• Update the database', '• Cannot be undone'],
      },
    );
    const result = await op.run();

    assertEquals(result.success, true);
    if (result.success)
    {
      assertEquals(result.data, true);
    }

    console.log('\nRESULT:', JSON.stringify(result));
  });

  const expected = await readFixture('ConfirmOp');
  assertEquals(normalizeOutput(output), normalizeOutput(expected));
});

Deno.test.beforeAll(() =>
{
  SubLoggerManager.initialize({ suppressSignalHandlers: true });
});
