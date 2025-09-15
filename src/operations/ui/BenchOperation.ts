import { FileIOBenchmark } from '../../benchmarks/fileIO.ts';
import type { BenchmarkResult } from '../../benchmarks/types.ts';
import type { BenchOptions } from '../../cli/types.ts';
import { BaseOperation } from '../base/BaseOperation.ts';
import type { OperationResult } from '../base/types.ts';

/**
Operation to run benchmarks
*/
export class BenchOperation extends BaseOperation<void>
{
  constructor(private options?: BenchOptions)
  {
    super('Benchmark');
  }

  protected async performOperation(): Promise<OperationResult<void>>
  {
    this.logger.info('Starting benchmark operation');

    console.log('\n🚀 BENCHMARK OPERATION');
    console.log('====================================');

    // Determine targets
    const targets = this.options?.targets && this.options.targets.length > 0
      ? this.options.targets
      : [Deno.cwd()];

    const quick = this.options?.quick ?? false;

    if (targets.length > 1)
    {
      console.log(`📁 Running benchmarks on ${targets.length} targets`);
    }

    if (quick)
    {
      console.log('⚡ Quick mode: ENABLED (reduced iterations)');
    }

    console.log('');

    // Create benchmark instances
    const benchmarks = [
      new FileIOBenchmark(),
      // Future: Add more benchmarks here
      // new CompilationBenchmark(),
      // new PackageManagerBenchmark(),
    ];

    // Run benchmarks for each target
    const allResults: BenchmarkResult[] = [];

    for (const target of targets)
    {
      console.log(`\n📍 Target: ${target}`);
      console.log('────────────────────────────────');

      for (const benchmark of benchmarks)
      {
        console.log(`\n▶️  Running: ${benchmark.name}`);
        console.log(`   ${benchmark.description}`);

        try
        {
          const result = await benchmark.run(target, quick);
          allResults.push(result);

          if (result.success)
          {
            console.log(`   ✅ Success: ${result.duration.toFixed(2)}ms`);
            if (result.opsPerSecond)
            {
              console.log(`   📊 Performance: ${result.opsPerSecond.toFixed(2)} ops/sec`);
            }
          }
          else
          {
            console.log(`   ❌ Failed: ${result.error}`);
          }
        }
        catch (error)
        {
          console.log(`   ❌ Unexpected error: ${error}`);
          allResults.push({
            name: benchmark.name,
            target,
            duration: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Summary
    console.log('\n\n📊 BENCHMARK SUMMARY');
    console.log('====================================');

    // Group results by benchmark
    for (const benchmark of benchmarks)
    {
      const benchResults = allResults.filter(r => r.name === benchmark.name);

      console.log(`\n${benchmark.name}:`);

      for (const result of benchResults)
      {
        const targetName = result.target === Deno.cwd() ? 'Current directory' : result.target;
        if (result.success)
        {
          console.log(`  ${targetName}: ${result.duration.toFixed(2)}ms`);
          if (result.opsPerSecond)
          {
            console.log(`    → ${result.opsPerSecond.toFixed(2)} ops/sec`);
          }
        }
        else
        {
          console.log(`  ${targetName}: FAILED (${result.error})`);
        }
      }
    }

    console.log('\n====================================\n');

    this.logger.info('Benchmark operation completed');

    return {
      success: true,
      data: undefined,
    };
  }
}
