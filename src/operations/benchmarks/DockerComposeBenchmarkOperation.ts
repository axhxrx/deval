import type { BenchmarkCommand } from '../../benchmarks/types.ts';
import { CommandSequenceBenchmarkOperation } from './CommandSequenceBenchmarkOperation.ts';

/**
Benchmark for Docker Compose operations
*/
export class DockerComposeBenchmarkOperation extends CommandSequenceBenchmarkOperation
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
        name: 'docker-compose pull',
        cmd: 'docker-compose',
        args: ['pull'],
        timeout: 300000, // 5 minutes
      },
      {
        name: 'docker-compose up -d',
        cmd: 'docker-compose',
        args: ['up', '-d'],
        timeout: 180000, // 3 minutes
      },
      {
        name: 'docker-compose ps',
        cmd: 'docker-compose',
        args: ['ps'],
        quiet: false, // Show running containers
      },
      {
        name: 'docker-compose down',
        cmd: 'docker-compose',
        args: ['down'],
        timeout: 60000, // 1 minute
      },
    ];

    super({
      name: 'Docker Compose',
      description: 'Measures time for Docker Compose operations',
      commands,
      target: options.target,
      quick: options.quick,
      testProject: options.testProject || {
        path: '/Volumes/CODE/@axhxrx/deval/test-projects/docker-simple',
        name: 'docker-simple',
      },
    });
  }
}

// Allow running standalone for testing
if (import.meta.main)
{
  const op = new DockerComposeBenchmarkOperation({
    quick: true,
  });

  const result = await op.execute();
  console.log('\nRESULT:', JSON.stringify(result, null, 2));
}
