import type { BenchmarkCommand } from '../../benchmarks/types.ts';
import { CommandSequenceBenchmarkOperation } from './CommandSequenceBenchmarkOperation.ts';

/**
Benchmark for building a React application
*/
export class BuildReactAppBenchmarkOperation extends CommandSequenceBenchmarkOperation
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
        name: 'npm run build',
        cmd: 'npm',
        args: ['run', 'build'],
        validateExists: ['build'],
        timeout: 180000, // 3 minutes
      },
    ];

    super({
      name: 'Build React App',
      description: 'Measures time to build a React production bundle',
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
  const op = new BuildReactAppBenchmarkOperation({
    quick: true,
  });

  const result = await op.execute();
  console.log('\nRESULT:', JSON.stringify(result, null, 2));
}
