import { FileIOBenchmark } from '../../benchmarks/fileIO.ts';
import type { BenchmarkReport, BenchmarkResult } from '../../benchmarks/types.ts';
import type { BenchOptions } from '../../cli/types.ts';
import { BenchmarkReportWriter } from '../../reports/BenchmarkReportWriter.ts';
import { HTMLReportGenerator } from '../../reports/html/HTMLReportGenerator.ts';
import { SystemInfoCollector } from '../../utils/SystemInfoCollector.ts';
import { BaseOperation } from '../base/BaseOperation.ts';
import type { Operation, OperationResult } from '../base/types.ts';
import { BuildAPIClientBenchmarkOperation } from '../benchmarks/BuildAPIClientBenchmarkOperation.ts';
import { BuildReactAppBenchmarkOperation } from '../benchmarks/BuildReactAppBenchmarkOperation.ts';
import { DockerComposeBenchmarkOperation } from '../benchmarks/DockerComposeBenchmarkOperation.ts';
import { NPMInstallBenchmarkOperation } from '../benchmarks/NPMInstallBenchmarkOperation.ts';
import { NPMRemoveNodeModulesBenchmarkOperation } from '../benchmarks/NPMRemoveNodeModulesBenchmarkOperation.ts';
import { PNPMInstallBenchmarkOperation } from '../benchmarks/PNPMInstallBenchmarkOperation.ts';
import { ConfirmOperation } from './primitives/ConfirmOperation.ts';
import { InputTextOperation } from './primitives/InputTextOperation.ts';
import { SelectOperation } from './primitives/SelectOperation.ts';

/**
Operation to run benchmarks with enhanced reporting
*/
export class BenchOperation extends BaseOperation<Operation<unknown> | null>
{
  constructor(private options?: BenchOptions)
  {
    super('Benchmark');
  }

  protected async performOperation(): Promise<OperationResult<Operation<unknown> | null>>
  {
    this.logger.info('Starting benchmark operation');

    console.log('\n🚀 BENCHMARK OPERATION');
    console.log('====================================');

    // Determine targets
    const targets = this.options?.targets && this.options.targets.length > 0
      ? this.options.targets
      : [Deno.cwd()];

    const quick = this.options?.quick ?? false;

    // Get user comment
    const commentOp = new InputTextOperation('Enter a comment for this benchmark run (optional)', undefined, {
      required: false,
    });
    const commentResult = await commentOp.execute();
    const userComment = commentResult.success ? commentResult.data || undefined : undefined;

    // Select benchmarks to run
    const benchmarkChoices = [
      'File I/O',
      'NPM Install',
      'NPM Remove node_modules',
      'Build React App',
      'Build API Client',
      'PNPM Install',
      'Docker Compose',
      'All Benchmarks',
    ];

    const selectOp = new SelectOperation('Select benchmarks to run', benchmarkChoices);
    const selectResult = await selectOp.execute();

    if (!selectResult.success || !selectResult.data)
    {
      return { success: true, data: null };
    }

    const selectedBenchmark = selectResult.data;

    // Determine output format
    const outputChoices = ['Console Only', 'Markdown Report', 'HTML Report', 'All Formats'];
    const outputOp = new SelectOperation('Select output format', outputChoices);
    const outputResult = await outputOp.execute();
    const outputFormat = outputResult.success ? outputResult.data || 'Console Only' : 'Console Only';

    if (targets.length > 1)
    {
      console.log(`\n📁 Running benchmarks on ${targets.length} targets`);
    }

    if (quick)
    {
      console.log('⚡ Quick mode: ENABLED (reduced iterations)');
    }

    console.log('');

    // Create benchmark instances based on selection
    const benchmarkOps: Operation<unknown>[] = [];

    if (selectedBenchmark === 'All Benchmarks' || selectedBenchmark === 'File I/O')
    {
      // Use the existing FileIOBenchmark for backwards compatibility
      // We'll run it separately from the operations
    }

    if (selectedBenchmark === 'All Benchmarks' || selectedBenchmark === 'NPM Install')
    {
      benchmarkOps.push(new NPMInstallBenchmarkOperation({ quick }));
    }

    if (selectedBenchmark === 'All Benchmarks' || selectedBenchmark === 'NPM Remove node_modules')
    {
      benchmarkOps.push(new NPMRemoveNodeModulesBenchmarkOperation({ quick }));
    }

    if (selectedBenchmark === 'All Benchmarks' || selectedBenchmark === 'Build React App')
    {
      benchmarkOps.push(new BuildReactAppBenchmarkOperation({ quick }));
    }

    if (selectedBenchmark === 'All Benchmarks' || selectedBenchmark === 'Build API Client')
    {
      benchmarkOps.push(new BuildAPIClientBenchmarkOperation({ quick }));
    }

    if (selectedBenchmark === 'All Benchmarks' || selectedBenchmark === 'PNPM Install')
    {
      benchmarkOps.push(new PNPMInstallBenchmarkOperation({ quick }));
    }

    if (selectedBenchmark === 'All Benchmarks' || selectedBenchmark === 'Docker Compose')
    {
      benchmarkOps.push(new DockerComposeBenchmarkOperation({ quick }));
    }

    // Run benchmarks for each target
    const allResults: BenchmarkResult[] = [];

    // Get system info once
    const systemInfo = await SystemInfoCollector.getSystemInfo();

    for (const target of targets)
    {
      console.log(`\n📍 Target: ${target}`);
      console.log('────────────────────────────────');

      // Run File I/O benchmark if selected
      if (selectedBenchmark === 'All Benchmarks' || selectedBenchmark === 'File I/O')
      {
        const fileIOBenchmark = new FileIOBenchmark();
        console.log(`\n▶️  Running: ${fileIOBenchmark.name}`);
        console.log(`   ${fileIOBenchmark.description}`);

        try
        {
          const result = await fileIOBenchmark.run(target, quick);
          result.filesystemLabel = SystemInfoCollector.getFilesystemLabel(target);
          result.timestamp = new Date();
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
        catch (error: unknown)
        {
          console.log(`   ❌ Unexpected error: ${error}`);
        }
      }

      // Run selected benchmark operations
      for (const op of benchmarkOps)
      {
        const result = await op.execute();
        if (result.success && result.data)
        {
          allResults.push(result.data as BenchmarkResult);
        }
      }
    }

    // Create benchmark report
    const report: BenchmarkReport = {
      reportVersion: '1.0.0',
      machineId: systemInfo.machineId,
      timestamp: new Date(),
      systemInfo,
      userComment,
      filesystemLabel: SystemInfoCollector.getFilesystemLabel(targets[0]),
      results: allResults,
    };

    // Generate outputs based on selection
    if (outputFormat === 'Markdown Report' || outputFormat === 'All Formats')
    {
      const filename = BenchmarkReportWriter.generateReportFilename(report);
      await BenchmarkReportWriter.writeReportToFile(report, filename);
      console.log(`\n📝 Markdown report saved: ${filename}`);
    }

    if (outputFormat === 'HTML Report' || outputFormat === 'All Formats')
    {
      const htmlFilename = `benchmark_comparison_${Date.now()}.html`;
      await HTMLReportGenerator.writeHTMLReport([report], htmlFilename);
      console.log(`\n🌐 HTML report saved: ${htmlFilename}`);
    }

    // Summary (always shown in console)
    console.log('\n\n📊 BENCHMARK SUMMARY');
    console.log('====================================');

    // Group results by benchmark name
    const benchmarkNames = [...new Set(allResults.map(r => r.name))];

    for (const name of benchmarkNames)
    {
      const benchResults = allResults.filter(r => r.name === name);

      console.log(`\n${name}:`);

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

    // Ask if user wants to compare with previous reports
    const compareOp = new ConfirmOperation('Would you like to compare with previous benchmark reports?');
    const compareResult = await compareOp.execute();

    if (compareResult.success && compareResult.data === true)
    {
      // Return a CompareOperation to be executed next
      const { CompareOperation } = await import('./CompareOperation.ts');
      return {
        success: true,
        data: new CompareOperation({
          files: [BenchmarkReportWriter.generateReportFilename(report)],
        }),
      };
    }

    return {
      success: true,
      data: null,
    };
  }
}
