import { stringify } from '@std/yaml';
import type { BenchmarkReport, BenchmarkResult } from '../benchmarks/types.ts';

/**
Writes benchmark reports in markdown format with YAML frontmatter
*/
export class BenchmarkReportWriter
{
  /**
  Generate a markdown report from benchmark data
  */
  static generateMarkdownReport(report: BenchmarkReport): string
  {
    const lines: string[] = [];

    // Generate YAML frontmatter
    const frontmatter = {
      report_version: report.reportVersion,
      machine_id: report.machineId,
      timestamp: report.timestamp.toISOString(),
      platform: report.systemInfo.platform,
      arch: report.systemInfo.arch,
      cpu: report.systemInfo.cpu,
      memory_gb: report.systemInfo.memoryGb,
      filesystem_label: report.filesystemLabel,
      user_comment: report.userComment || '',
    };

    lines.push('---');
    lines.push(stringify(frontmatter).trim());
    lines.push('---');
    lines.push('');

    // Title
    lines.push('# Benchmark Report');
    lines.push('');

    // System Information section
    lines.push('## System Information');
    lines.push(
      `- **Platform**: ${report.systemInfo.platform}${
        report.systemInfo.osVersion ? ` (${report.systemInfo.osVersion})` : ''
      }`,
    );
    lines.push(`- **Architecture**: ${report.systemInfo.arch}`);
    lines.push(`- **CPU**: ${report.systemInfo.cpu}`);
    lines.push(`- **Memory**: ${report.systemInfo.memoryGb} GB (${report.systemInfo.freeMemoryGb} GB free)`);
    lines.push(`- **Filesystem**: ${report.filesystemLabel}`);
    lines.push(`- **Hostname**: ${report.systemInfo.hostname}`);
    lines.push(`- **Machine ID**: ${report.machineId}`);
    lines.push('');

    // User comment if present
    if (report.userComment)
    {
      lines.push('## Test Notes');
      lines.push(report.userComment);
      lines.push('');
    }

    // Benchmark Results table
    lines.push('## Benchmark Results');
    lines.push('');
    lines.push('| Benchmark | Duration (ms) | Ops/sec | Status | Details |');
    lines.push('|-----------|--------------|---------|---------|---------|');

    for (const result of report.results)
    {
      const status = result.success ? '✅ Success' : '❌ Failed';
      const opsPerSec = result.opsPerSecond ? result.opsPerSecond.toFixed(2) : '-';
      const details = this.getResultDetails(result);

      lines.push(
        `| ${result.name} | ${result.duration.toFixed(2)} | ${opsPerSec} | ${status} | ${details} |`,
      );
    }

    lines.push('');

    // Metadata section
    lines.push('## Run Information');
    lines.push(`- **Date**: ${report.timestamp.toLocaleString()}`);
    lines.push(`- **Report Version**: ${report.reportVersion}`);

    // Add failed benchmark details if any
    const failedResults = report.results.filter(r => !r.success);
    if (failedResults.length > 0)
    {
      lines.push('');
      lines.push('## Error Details');
      for (const failed of failedResults)
      {
        lines.push(`### ${failed.name}`);
        lines.push(`Error: ${failed.error || 'Unknown error'}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
  Get details string for a benchmark result
  */
  private static getResultDetails(result: BenchmarkResult): string
  {
    const details: string[] = [];

    if (result.metadata)
    {
      if (result.metadata.mode)
      {
        details.push(`${result.metadata.mode} mode`);
      }
      if (result.metadata.iterations)
      {
        details.push(`${result.metadata.iterations} iterations`);
      }
      if (result.metadata.commandsExecuted && result.metadata.totalCommands)
      {
        details.push(`${result.metadata.commandsExecuted}/${result.metadata.totalCommands} commands`);
      }
      if (result.metadata.failedCommand)
      {
        details.push(`failed at: ${result.metadata.failedCommand}`);
      }
    }

    return details.join(', ') || '-';
  }

  /**
  Write report to file
  */
  static async writeReportToFile(report: BenchmarkReport, filepath: string): Promise<void>
  {
    const content = this.generateMarkdownReport(report);
    await Deno.writeTextFile(filepath, content);
  }

  /**
  Generate a filename for the report
  */
  static generateReportFilename(report: BenchmarkReport): string
  {
    const timestamp = report.timestamp.toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-')
      .replace('T', '_')
      .replace('Z', '');

    const platform = report.systemInfo.platform;
    const machineShort = report.machineId.split('-').slice(-1)[0];

    return `benchmark_${platform}_${machineShort}_${timestamp}.md`;
  }
}
