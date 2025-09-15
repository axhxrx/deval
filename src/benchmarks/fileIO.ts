import { Cmd } from '@axhxrx/cmd';
import { join } from '@std/path';
import type { Benchmark, BenchmarkResult } from './types.ts';

/**
File I/O benchmark that writes many small files
Similar to: time (for i in {1..1000}; do echo "test" > file$i; done)
*/
export class FileIOBenchmark implements Benchmark
{
  name = 'File I/O';
  description = 'Tests file system performance by writing many small files';

  async run(target: string, quick = false): Promise<BenchmarkResult>
  {
    const iterations = quick ? 100 : 1000;
    const testDir = join(target, `disktest_${Date.now()}`);

    try
    {
      // Create test directory
      const mkdirResult = await Cmd.run({
        cmd: 'mkdir',
        args: ['-p', testDir],
        quiet: true,
      });

      if (!mkdirResult.success)
      {
        throw new Error(`Failed to create test directory: ${mkdirResult.error}`);
      }

      // Start timing
      const startTime = performance.now();

      // Write files using Cmd.writeTextFile with quiet mode
      const writePromises: Promise<unknown>[] = [];
      for (let i = 1; i <= iterations; i++)
      {
        const filePath = join(testDir, `file${i}`);
        const writeCmd = Cmd.writeTextFile(filePath, 'test\n');
        writeCmd.quiet = true;
        writePromises.push(writeCmd.run());
      }

      // Wait for all writes to complete
      const results = await Promise.all(writePromises);

      // End timing
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Check if all writes succeeded
      const allSucceeded = results.every((r) => (r as { success: boolean }).success);

      if (!allSucceeded)
      {
        throw new Error('Some file writes failed');
      }

      // Clean up test directory
      await Cmd.run({
        cmd: 'rm',
        args: ['-rf', testDir],
        quiet: true,
      });

      // Calculate operations per second
      const opsPerSecond = (iterations / duration) * 1000;

      return {
        name: this.name,
        target,
        duration,
        opsPerSecond,
        success: true,
        metadata: {
          iterations,
          mode: quick ? 'quick' : 'full',
        },
      };
    }
    catch (error)
    {
      // Try to clean up on error
      try
      {
        await Cmd.run({
          cmd: 'rm',
          args: ['-rf', testDir],
          quiet: true,
        });
      }
      catch
      {
        // Ignore cleanup errors
      }

      return {
        name: this.name,
        target,
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          iterations,
          mode: quick ? 'quick' : 'full',
        },
      };
    }
  }
}
