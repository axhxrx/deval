import { FileIOBenchmark } from '../../benchmarks/fileIO.ts';
import type { BenchmarkReport, BenchmarkResult } from '../../benchmarks/types.ts';
import type { BenchOptions } from '../../cli/types.ts';
import { BenchmarkReportWriter } from '../../reports/BenchmarkReportWriter.ts';
import { HTMLReportGenerator } from '../../reports/html/HTMLReportGenerator.ts';
import { SystemInfoCollector } from '../../utils/SystemInfoCollector.ts';
import { BaseOp } from '../base/BaseOp.ts';
import type { Op, Outcome } from '../base/types.ts';
import { BuildAPIClientBenchmarkOp } from '../benchmarks/BuildAPIClientBenchmarkOp.ts';
import { BuildReactAppBenchmarkOp } from '../benchmarks/BuildReactAppBenchmarkOp.ts';
import { DockerComposeBenchmarkOp } from '../benchmarks/DockerComposeBenchmarkOp.ts';
import { NPMInstallBenchmarkOp } from '../benchmarks/NPMInstallBenchmarkOp.ts';
import { NPMRemoveNodeModulesBenchmarkOp } from '../benchmarks/NPMRemoveNodeModulesBenchmarkOp.ts';
import { PNPMInstallBenchmarkOp } from '../benchmarks/PNPMInstallBenchmarkOp.ts';
import { ConfirmOp } from './primitives/ConfirmOp.ts';
import { InputTextOp } from './primitives/InputTextOp.ts';
import { SelectOp } from './primitives/SelectOp.ts';

/**
Op to run benchmarks with enhanced reporting
*/
export class BenchOp extends BaseOp<Op<unknown> | null>
{
  constructor(private options?: BenchOptions)
  {
    super('Benchmark');
  }

  protected async performOp(): Promise<Outcome<Op<unknown> | null>>
  {
    this.logger.info('Starting benchmark Op');

    console.log('\n🚀 BENCHMARK Op');
    console.log('====================================');

    // Determine targets
    const targets = this.options?.targets && this.options.targets.length > 0
      ? this.options.targets
      : [Deno.cwd()];

    const quick = this.options?.quick ?? false;

    // Get user comment
    const commentOp = new InputTextOp('Enter a comment for this benchmark run (optional)', undefined, {
      required: false,
    });
    const commentResult = await commentOp.run();
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

    const selectOp = new SelectOp('Select benchmarks to run', benchmarkChoices);
    const selectResult = await selectOp.run();

    if (!selectResult.success || !selectResult.data)
    {
      return { success: true, data: null };
    }

    const selectedBenchmark = selectResult.data;

    // Determine output format
    const outputChoices = ['Console Only', 'Markdown Report', 'HTML Report', 'All Formats'];
    const outputOp = new SelectOp('Select output format', outputChoices);
    const outputResult = await outputOp.run();
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
    const benchmarkOps: Op<unknown>[] = [];

    if (selectedBenchmark === 'All Benchmarks' || selectedBenchmark === 'File I/O')
    {
      // Use the existing FileIOBenchmark for backwards compatibility
      // We'll run it separately from the Ops
    }

    if (selectedBenchmark === 'All Benchmarks' || selectedBenchmark === 'NPM Install')
    {
      benchmarkOps.push(new NPMInstallBenchmarkOp({ quick }));
    }

    if (selectedBenchmark === 'All Benchmarks' || selectedBenchmark === 'NPM Remove node_modules')
    {
      benchmarkOps.push(new NPMRemoveNodeModulesBenchmarkOp({ quick }));
    }

    if (selectedBenchmark === 'All Benchmarks' || selectedBenchmark === 'Build React App')
    {
      benchmarkOps.push(new BuildReactAppBenchmarkOp({ quick }));
    }

    if (selectedBenchmark === 'All Benchmarks' || selectedBenchmark === 'Build API Client')
    {
      benchmarkOps.push(new BuildAPIClientBenchmarkOp({ quick }));
    }

    if (selectedBenchmark === 'All Benchmarks' || selectedBenchmark === 'PNPM Install')
    {
      benchmarkOps.push(new PNPMInstallBenchmarkOp({ quick }));
    }

    if (selectedBenchmark === 'All Benchmarks' || selectedBenchmark === 'Docker Compose')
    {
      benchmarkOps.push(new DockerComposeBenchmarkOp({ quick }));
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

      // Run selected benchmark Ops
      for (const op of benchmarkOps)
      {
        const result = await op.run();
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

    this.logger.info('Benchmark Op completed');

    // Ask if user wants to compare with previous reports
    const compareOp = new ConfirmOp('Would you like to compare with previous benchmark reports?');
    const compareResult = await compareOp.run();

    if (compareResult.success && compareResult.data === true)
    {
      // Return a CompareOp to be rund next
      const { CompareOp } = await import('./CompareOp.ts');
      return {
        success: true,
        data: new CompareOp({
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
