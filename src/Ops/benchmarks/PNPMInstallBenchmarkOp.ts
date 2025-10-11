import type { BenchmarkCommand } from '../../benchmarks/types.ts';
import { CommandSequenceBenchmarkOp } from './CommandSequenceBenchmarkOp.ts';

/**
Benchmark for PNPM install Op
*/
export class PNPMInstallBenchmarkOp extends CommandSequenceBenchmarkOp
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
        name: 'pnpm install',
        cmd: 'pnpm',
        args: ['install'],
        validateExists: ['node_modules'],
        timeout: 300000, // 5 minutes
      },
    ];

    super({
      name: 'PNPM Install',
      description: 'Measures time to install dependencies with pnpm',
      commands,
      target: options.target,
      quick: options.quick,
      testProject: options.testProject || {
        path: '/Volumes/CODE/@axhxrx/deval/test-projects/pnpm-compatible',
        name: 'pnpm-compatible',
      },
    });
  }
}

// Allow running standalone for testing
if (import.meta.main)
{
  const op = new PNPMInstallBenchmarkOp({
    quick: true,
  });

  const result = await op.run();
  console.log('\nRESULT:', JSON.stringify(result, null, 2));
}
