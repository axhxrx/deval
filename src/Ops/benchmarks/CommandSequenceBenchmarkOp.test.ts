import { assertEquals } from '@std/assert';
import { SubLoggerManager } from '../../logger/SubLoggerManager.ts';
import { CommandSequenceBenchmarkOp } from './CommandSequenceBenchmarkOp.ts';

Deno.test.beforeAll(() =>
{
  SubLoggerManager.initialize({ suppressSignalHandlers: true });
});

Deno.test('CommandSequenceBenchmarkOp - basic test', async () =>
{
  const op = new CommandSequenceBenchmarkOp({
    name: 'Test Benchmark',
    description: 'Test benchmark Op',
    commands: [
      {
        name: 'Create test file',
        cmd: 'echo',
        args: ['test content'],
      },
      {
        name: 'List directory',
        cmd: 'ls',
        args: ['-la'],
      },
    ],
    quick: true,
  });

  const result = await op.run();

  assertEquals(result.success, true);
  if (result.success && result.data)
  {
    assertEquals(result.data.name, 'Test Benchmark');
    assertEquals(result.data.success, true);
    assertEquals(typeof result.data.duration, 'number');
    assertEquals(result.data.metadata?.commandsRun, 2);
    assertEquals(result.data.metadata?.totalCommands, 2);
  }
});

Deno.test('CommandSequenceBenchmarkOp - handles failed commands', async () =>
{
  const op = new CommandSequenceBenchmarkOp({
    name: 'Failing Benchmark',
    description: 'Test benchmark with failing command',
    commands: [
      {
        name: 'This will fail',
        cmd: 'nonexistentcommand',
        args: ['--fail'],
      },
    ],
    quick: true,
  });

  const result = await op.run();

  // Op itself fails when command is not found
  assertEquals(result.success, false);
  if (!result.success)
  {
    assertEquals(typeof result.error, 'string');
  }
});
