import type { BenchmarkCommand } from '../../benchmarks/types.ts';
import { CommandSequenceBenchmarkOp } from './CommandSequenceBenchmarkOp.ts';

/**
Benchmark for building a TypeScript API client
*/
export class BuildAPIClientBenchmarkOp extends CommandSequenceBenchmarkOp
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
        name: 'tsc build',
        cmd: 'npx',
        args: ['tsc'],
        validateExists: ['dist'],
        timeout: 120000, // 2 minutes
      },
    ];

    super({
      name: 'Build API Client',
      description: 'Measures time to compile TypeScript API client',
      commands,
      target: options.target,
      quick: options.quick,
      testProject: options.testProject || {
        path: '/Volumes/CODE/@axhxrx/deval/test-projects/simple-ts-api',
        name: 'simple-ts-api',
      },
    });
  }
}

// Allow running standalone for testing
if (import.meta.main)
{
  const op = new BuildAPIClientBenchmarkOp({
    quick: true,
  });

  const result = await op.run();
  console.log('\nRESULT:', JSON.stringify(result, null, 2));
}
