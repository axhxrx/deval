import { assertEquals } from '@std/assert';
import { SubLoggerManager } from '../../../logger/SubLoggerManager.ts';
import { initUserInputQueue } from '../../../runtime/UserInputQueue.ts';
import { captureOutput, normalizeOutput, readFixture } from '../test-helpers.ts';
import { InputMultipleTextOp } from './InputMultipleTextOp.ts';

Deno.test('InputMultipleTextOp with all fields', async () =>
{
  const output = await captureOutput(async () =>
  {
    initUserInputQueue('input:"Bert",input:"me@me.me",input:"666",input:"Your mom"');
    const op = new InputMultipleTextOp(
      '📝 Example Multi-Field Form',
      [
        {
          key: 'name',
          message: 'What is your name?',
          defaultValue: 'Anonymous',
          required: true,
        },
        {
          key: 'email',
          message: 'What is your email address?',
          validation: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          },
        },
        {
          key: 'age',
          message: 'How old are you?',
          validation: {
            numeric: true,
            minLength: 1,
            maxLength: 3,
          },
        },
        {
          key: 'location',
          message: 'Where are you located?',
          defaultValue: 'Earth',
        },
      ],
    );
    const result = await op.run();

    assertEquals(result.success, true);
    if (result.success && result.data)
    {
      assertEquals(result.data.name, 'Bert');
      assertEquals(result.data.email, 'me@me.me');
      assertEquals(result.data.age, '666');
      assertEquals(result.data.location, 'Your mom');
    }

    console.log('\nFINAL RESULT:', JSON.stringify(result));
  });

  const expected = await readFixture('InputMultipleTextOp');
  assertEquals(normalizeOutput(output), normalizeOutput(expected));
});

Deno.test.beforeAll(() =>
{
  SubLoggerManager.initialize({ suppressSignalHandlers: true });
});
