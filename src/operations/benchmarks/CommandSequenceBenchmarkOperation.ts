import { Cmd, type CmdResult } from '@axhxrx/cmd';
import { join } from '@std/path';
import type { BenchmarkCommand, BenchmarkResult } from '../../benchmarks/types.ts';
import { SystemInfoCollector } from '../../utils/SystemInfoCollector.ts';
import { BaseOperation } from '../base/BaseOperation.ts';
import type { OperationResult } from '../base/types.ts';

/**
Options for command sequence benchmark
*/
export interface CommandSequenceBenchmarkOptions
{
  /**
  Name of the benchmark
  */
  name: string;

  /**
  Description of what this benchmark tests
  */
  description: string;

  /**
  Commands to execute in sequence
  */
  commands: BenchmarkCommand[];

  /**
  Target directory to run benchmark in
  */
  target?: string;

  /**
  Whether to run in quick mode (fewer iterations)
  */
  quick?: boolean;

  /**
  Whether to clean up after benchmark
  */
  cleanup?: boolean;

  /**
  Test project to clone/use (if applicable)
  */
  testProject?: {
    url?: string;
    path?: string;
    name: string;
  };
}

/**
Base operation for running command sequence benchmarks
*/
export class CommandSequenceBenchmarkOperation extends BaseOperation<BenchmarkResult>
{
  protected benchmarkName: string;
  protected benchmarkDescription: string;
  protected commands: BenchmarkCommand[];
  protected target: string;
  protected quick: boolean;
  protected cleanup: boolean;
  protected testProject?: {
    url?: string;
    path?: string;
    name: string;
  };

  constructor(options: CommandSequenceBenchmarkOptions)
  {
    super(options.name);
    this.benchmarkName = options.name;
    this.benchmarkDescription = options.description;
    this.commands = options.commands;
    this.target = options.target || Deno.cwd();
    this.quick = options.quick ?? false;
    this.cleanup = options.cleanup ?? true;
    this.testProject = options.testProject;
  }

  protected async performOperation(): Promise<OperationResult<BenchmarkResult>>
  {
    const testDir = join(this.target, `benchmark_${this.benchmarkName.replace(/\s+/g, '_')}_${Date.now()}`);

    try
    {
      this.logger.info(`Starting benchmark: ${this.benchmarkName}`);
      console.log(`\n🏁 Starting: ${this.benchmarkName}`);
      console.log(`   ${this.benchmarkDescription}`);
      console.log(`   Target: ${this.target}`);

      // Create test directory
      const mkdirResult = await Cmd.run({
        cmd: 'mkdir',
        args: ['-p', testDir],
        quiet: true,
      });

      if (!mkdirResult.success)
      {
        throw new Error(`Failed to create test directory: ${mkdirResult.error?.message}`);
      }

      // Set up test project if needed
      if (this.testProject)
      {
        await this.setupTestProject(testDir);
      }

      // Start timing
      const startTime = performance.now();
      const startDate = new Date();

      // Execute command sequence
      const commandResults: CmdResult[] = [];
      let allSuccess = true;

      for (const command of this.commands)
      {
        console.log(`   → Running: ${command.name}`);

        const cmdResult = await Cmd.run({
          cmd: command.cmd,
          args: command.args || [],
          cwd: command.cwd || testDir,
          quiet: command.quiet ?? true,
        });

        commandResults.push(cmdResult);

        if (!cmdResult.success)
        {
          console.log(`   ✗ Failed: ${command.name}`);
          allSuccess = false;
          break;
        }

        // Validate expected files if specified
        if (command.validateExists)
        {
          for (const path of command.validateExists)
          {
            const fullPath = join(command.cwd || testDir, path);
            try
            {
              await Deno.stat(fullPath);
            }
            catch
            {
              console.log(`   ✗ Validation failed: ${path} not found`);
              allSuccess = false;
              break;
            }
          }
        }

        if (!allSuccess) break;
      }

      // End timing
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Clean up if requested
      if (this.cleanup)
      {
        await this.cleanupTestDirectory(testDir);
      }

      // Get filesystem label
      const filesystemLabel = SystemInfoCollector.getFilesystemLabel(this.target);

      if (allSuccess)
      {
        console.log(`   ✅ Success: ${duration.toFixed(2)}ms`);

        return {
          success: true,
          data: {
            name: this.benchmarkName,
            target: this.target,
            duration,
            success: true,
            filesystemLabel,
            timestamp: startDate,
            metadata: {
              mode: this.quick ? 'quick' : 'full',
              commandsExecuted: commandResults.length,
              totalCommands: this.commands.length,
            },
          },
        };
      }
      else
      {
        const lastFailedCommand = this.commands[commandResults.length - 1];
        const lastResult = commandResults[commandResults.length - 1];
        const errorMessage = lastResult?.error?.message || lastResult?.stderr || 'Unknown error';

        console.log(`   ❌ Failed at step: ${lastFailedCommand.name}`);

        return {
          success: true, // Operation itself succeeded, benchmark failed
          data: {
            name: this.benchmarkName,
            target: this.target,
            duration,
            success: false,
            error: `Failed at "${lastFailedCommand.name}": ${errorMessage}`,
            filesystemLabel,
            timestamp: startDate,
            metadata: {
              mode: this.quick ? 'quick' : 'full',
              commandsExecuted: commandResults.length,
              totalCommands: this.commands.length,
              failedCommand: lastFailedCommand.name,
            },
          },
        };
      }
    }
    catch (error: unknown)
    {
      // Try to clean up on error
      if (this.cleanup)
      {
        await this.cleanupTestDirectory(testDir);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: `Benchmark operation failed: ${errorMessage}`,
      };
    }
  }

  /**
  Set up test project (clone or copy)
  */
  protected async setupTestProject(testDir: string): Promise<void>
  {
    if (!this.testProject) return;

    console.log(`   📦 Setting up test project: ${this.testProject.name}`);

    if (this.testProject.url)
    {
      // Clone from URL
      const cloneResult = await Cmd.run({
        cmd: 'git',
        args: ['clone', '--depth', '1', this.testProject.url, testDir],
        quiet: true,
      });

      if (!cloneResult.success)
      {
        const errorMsg = cloneResult.error?.message || cloneResult.stderr || 'Unknown error';
        throw new Error(`Failed to clone test project: ${errorMsg}`);
      }
    }
    else if (this.testProject.path)
    {
      // Copy from local path - copy contents, not the directory itself
      const copyResult = await Cmd.run({
        cmd: 'cp',
        args: ['-r', `${this.testProject.path}/.`, testDir],
        quiet: true,
      });

      if (!copyResult.success)
      {
        const errorMsg = copyResult.error?.message || copyResult.stderr || 'Unknown error';
        throw new Error(`Failed to copy test project: ${errorMsg}`);
      }
    }
  }

  /**
  Clean up test directory
  */
  protected async cleanupTestDirectory(testDir: string): Promise<void>
  {
    try
    {
      console.log('   🧹 Cleaning up test directory...');
      await Cmd.run({
        cmd: 'rm',
        args: ['-rf', testDir],
        quiet: true,
      });
    }
    catch (error: unknown)
    {
      console.warn('   ⚠️  Could not clean up test directory:', error);
    }
  }
}

// Allow running standalone for testing
if (import.meta.main)
{
  const op = new CommandSequenceBenchmarkOperation({
    name: 'Test Command Sequence',
    description: 'Test the command sequence benchmark operation',
    commands: [
      {
        name: 'Create file',
        cmd: 'echo',
        args: ['test content > test.txt'],
      },
      {
        name: 'List files',
        cmd: 'ls',
        args: ['-la'],
      },
    ],
    quick: true,
  });

  const result = await op.execute();
  console.log('\nRESULT:', JSON.stringify(result, null, 2));
}
