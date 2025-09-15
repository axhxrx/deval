import { assertEquals } from '@std/assert';
import { SubLoggerManager } from '../../logger/SubLoggerManager.ts';
import { CommandSequenceBenchmarkOperation } from './CommandSequenceBenchmarkOperation.ts';

Deno.test.beforeAll(() =>
{
  SubLoggerManager.initialize({ suppressSignalHandlers: true });
});

Deno.test('CommandSequenceBenchmarkOperation - basic test', async () =>
{
  const op = new CommandSequenceBenchmarkOperation({
    name: 'Test Benchmark',
    description: 'Test benchmark operation',
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

  const result = await op.execute();

  assertEquals(result.success, true);
  if (result.success && result.data)
  {
    assertEquals(result.data.name, 'Test Benchmark');
    assertEquals(result.data.success, true);
    assertEquals(typeof result.data.duration, 'number');
    assertEquals(result.data.metadata?.commandsExecuted, 2);
    assertEquals(result.data.metadata?.totalCommands, 2);
  }
});

Deno.test('CommandSequenceBenchmarkOperation - handles failed commands', async () =>
{
  const op = new CommandSequenceBenchmarkOperation({
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

  const result = await op.execute();

  // Operation itself fails when command is not found
  assertEquals(result.success, false);
  if (!result.success)
  {
    assertEquals(typeof result.error, 'string');
  }
});
