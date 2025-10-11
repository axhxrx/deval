import type { BenchmarkReport } from '../../benchmarks/types.ts';
import type { CompareOptions } from '../../cli/types.ts';
import { BenchmarkReportParser } from '../../reports/BenchmarkReportParser.ts';
import { HTMLReportGenerator } from '../../reports/html/HTMLReportGenerator.ts';
import { BaseOp } from '../base/BaseOp.ts';
import type { Outcome } from '../base/types.ts';

/**
Op to compare benchmark results
*/
export class CompareOp extends BaseOp<void>
{
  constructor(private options?: CompareOptions)
  {
    super('Compare');
  }

  protected async performOp(): Promise<Outcome<void>>
  {
    this.logger.info('Starting compare Op');

    console.log('\n📊 COMPARE Op');
    console.log('====================================');

    if (!this.options?.files || this.options.files.length === 0)
    {
      console.log('❌ No files specified for comparison');
      console.log('\nUsage: deval compare <file1.md> <file2.md> ...');
      console.log('   or: deval compare *.md');
      return {
        success: false,
        error: 'No files specified',
      };
    }

    console.log(`\nComparing ${this.options.files.length} benchmark files:`);
    for (const file of this.options.files)
    {
      console.log(`  • ${file}`);
    }

    // Parse all report files
    const reports: BenchmarkReport[] = [];
    const failedFiles: string[] = [];

    for (const file of this.options.files)
    {
      try
      {
        const report = await BenchmarkReportParser.parseReportFromFile(file);
        reports.push(report);
        console.log(`  ✅ Parsed: ${file}`);
      }
      catch (error: unknown)
      {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`  ❌ Failed to parse ${file}: ${errorMessage}`);
        failedFiles.push(file);
      }
    }

    if (reports.length === 0)
    {
      console.log('\n❌ No valid reports could be parsed');
      return {
        success: false,
        error: 'No valid reports found',
      };
    }

    if (failedFiles.length > 0)
    {
      console.log(`\n⚠️  Warning: ${failedFiles.length} file(s) could not be parsed`);
    }

    // Sort reports by timestamp
    reports.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Display comparison summary
    console.log('\n\n📊 COMPARISON SUMMARY');
    console.log('====================================');

    // Group by machine
    const machineGroups = this.groupByMachine(reports);

    for (const [machineId, machineReports] of Object.entries(machineGroups))
    {
      console.log(`\n🖥️  Machine: ${machineId}`);

      const firstReport = machineReports[0];
      console.log(`   ${firstReport.systemInfo.cpu}`);
      console.log(`   ${firstReport.systemInfo.memoryGb} GB RAM • ${firstReport.systemInfo.platform}`);
      console.log(`   Reports: ${machineReports.length}`);

      // Show benchmark trends for this machine
      const benchmarkNames = this.getUniqueBenchmarks(machineReports);

      for (const benchmarkName of benchmarkNames)
      {
        console.log(`\n   📈 ${benchmarkName}:`);

        for (const report of machineReports)
        {
          const result = report.results.find(r => r.name === benchmarkName);
          if (result)
          {
            const status = result.success ? '✅' : '❌';
            const duration = result.success ? `${result.duration.toFixed(2)}ms` : 'FAILED';
            const date = report.timestamp.toLocaleDateString();
            const comment = report.userComment ? ` (${report.userComment})` : '';

            console.log(`      ${date}: ${status} ${duration}${comment}`);
          }
        }
      }
    }

    // Calculate improvements/regressions
    if (reports.length >= 2)
    {
      console.log('\n\n📊 PERFORMANCE CHANGES');
      console.log('====================================');

      const firstReport = reports[0];
      const lastReport = reports[reports.length - 1];

      const benchmarkNames = this.getUniqueBenchmarks(reports);

      for (const benchmarkName of benchmarkNames)
      {
        const firstResult = firstReport.results.find(r => r.name === benchmarkName);
        const lastResult = lastReport.results.find(r => r.name === benchmarkName);

        if (firstResult?.success && lastResult?.success)
        {
          const change = ((lastResult.duration - firstResult.duration) / firstResult.duration) * 100;
          const emoji = change < 0 ? '⚡' : change > 0 ? '🐌' : '➡️';
          const changeStr = change < 0
            ? `${Math.abs(change).toFixed(1)}% faster`
            : change > 0
            ? `${change.toFixed(1)}% slower`
            : 'No change';

          console.log(`${emoji} ${benchmarkName}: ${changeStr}`);
          console.log(`   First: ${firstResult.duration.toFixed(2)}ms → Last: ${lastResult.duration.toFixed(2)}ms`);
        }
      }
    }

    // Generate HTML comparison report
    const htmlFilename = `benchmark_comparison_${Date.now()}.html`;
    await HTMLReportGenerator.writeHTMLReport(reports, htmlFilename);

    console.log('\n====================================');
    console.log(`\n🌐 HTML comparison report saved: ${htmlFilename}`);
    console.log('   Open this file in a browser to see interactive charts');

    this.logger.info('Compare Op completed');

    return {
      success: true,
      data: undefined,
    };
  }

  private groupByMachine(reports: BenchmarkReport[]): Record<string, BenchmarkReport[]>
  {
    const groups: Record<string, BenchmarkReport[]> = {};

    for (const report of reports)
    {
      if (!groups[report.machineId])
      {
        groups[report.machineId] = [];
      }
      groups[report.machineId].push(report);
    }

    return groups;
  }

  private getUniqueBenchmarks(reports: BenchmarkReport[]): string[]
  {
    const benchmarks = new Set<string>();

    for (const report of reports)
    {
      for (const result of report.results)
      {
        benchmarks.add(result.name);
      }
    }

    return [...benchmarks];
  }
}
