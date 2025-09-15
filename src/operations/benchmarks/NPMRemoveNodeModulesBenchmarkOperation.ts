import type { BenchmarkCommand } from '../../benchmarks/types.ts';
import { CommandSequenceBenchmarkOperation } from './CommandSequenceBenchmarkOperation.ts';

/**
Benchmark for removing node_modules directory
*/
export class NPMRemoveNodeModulesBenchmarkOperation extends CommandSequenceBenchmarkOperation
{
  constructor(options: {
    target?: string;
    quick?: boolean;
    testProject?: {
      url?: string;
      path?: string;
      name: string;
    };
  } = {})
  {
    const commands: BenchmarkCommand[] = [
      {
        name: 'npm install (setup)',
        cmd: 'npm',
        args: ['install'],
        validateExists: ['node_modules'],
        timeout: 300000, // 5 minutes
      },
      {
        name: 'measure size',
        cmd: 'du',
        args: ['-sh', 'node_modules'],
        quiet: false, // Show the size
      },
      {
        name: 'remove node_modules',
        cmd: 'rm',
        args: ['-rf', 'node_modules'],
        timeout: 60000, // 1 minute
      },
    ];

    super({
      name: 'NPM Remove node_modules',
      description: 'Measures time to remove node_modules directory',
      commands,
      target: options.target,
      quick: options.quick,
      testProject: options.testProject || {
        path: '/Volumes/CODE/@axhxrx/deval/test-projects/simple-react',
        name: 'simple-react',
      },
    });
  }
}

// Allow running standalone for testing
if (import.meta.main)
{
  const op = new NPMRemoveNodeModulesBenchmarkOperation({
    quick: true,
  });

  const result = await op.execute();
  console.log('\nRESULT:', JSON.stringify(result, null, 2));
}
