import { assertEquals } from '@std/assert';
import { SubLoggerManager } from '../../../logger/SubLoggerManager.ts';
import { initUserInputQueue } from '../../../runtime/UserInputQueue.ts';
import { captureOutput, normalizeOutput, readFixture } from '../test-helpers.ts';
import { ConfirmOperation } from './ConfirmOperation.ts';

Deno.test('ConfirmOperation with more info flow', async () =>
{
  const output = await captureOutput(async () =>
  {
    initUserInputQueue('confirm:help,confirm:yes,confirm:yes');
    const op = new ConfirmOperation(
      'Do you want to proceed with the operation?',
      {
        moreInfo: ['This operation will:', '• Process all files', '• Update the database', '• Cannot be undone'],
      },
    );
    const result = await op.execute();

    assertEquals(result.success, true);
    if (result.success)
    {
      assertEquals(result.data, true);
    }

    console.log('\nRESULT:', JSON.stringify(result));
  });

  const expected = await readFixture('ConfirmOperation');
  assertEquals(normalizeOutput(output), normalizeOutput(expected));
});

Deno.test.beforeAll(() =>
{
  SubLoggerManager.initialize({ suppressSignalHandlers: true });
});
