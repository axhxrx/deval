import type { BenchmarkCommand } from '../../benchmarks/types.ts';
import { CommandSequenceBenchmarkOp } from './CommandSequenceBenchmarkOp.ts';

/**
Benchmark for NPM install Op
*/
export class NPMInstallBenchmarkOp extends CommandSequenceBenchmarkOp
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
        name: 'npm install',
        cmd: 'npm',
        args: ['install'],
        validateExists: ['node_modules'],
        timeout: 300000, // 5 minutes
      },
    ];

    super({
      name: 'NPM Install',
      description: 'Measures time to install dependencies with npm',
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
  const op = new NPMInstallBenchmarkOp({
    quick: true,
  });

  const result = await op.run();
  console.log('\nRESULT:', JSON.stringify(result, null, 2));
}
