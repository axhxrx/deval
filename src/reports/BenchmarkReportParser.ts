import { parse as parseYaml } from '@std/yaml';
import type { BenchmarkReport, BenchmarkResult, SystemInfo } from '../benchmarks/types.ts';

/**
Parses benchmark reports from markdown format
*/
export class BenchmarkReportParser
{
  /**
  Parse a markdown report into a BenchmarkReport object
  */
  static parseMarkdownReport(content: string): BenchmarkReport
  {
    // Extract YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch)
    {
      throw new Error('Invalid report format: missing YAML frontmatter');
    }

    const frontmatter = parseYaml(frontmatterMatch[1]) as Record<string, unknown>;

    // Parse the markdown content
    const markdownContent = content.substring(frontmatterMatch[0].length);

    // Extract system info from frontmatter and markdown
    const systemInfo = this.extractSystemInfo(frontmatter, markdownContent);

    // Extract benchmark results from table
    const results = this.extractBenchmarkResults(markdownContent);

    return {
      reportVersion: (frontmatter.report_version as string) || '1.0.0',
      machineId: frontmatter.machine_id as string,
      timestamp: new Date(frontmatter.timestamp as string),
      systemInfo,
      userComment: (frontmatter.user_comment as string) || undefined,
      filesystemLabel: frontmatter.filesystem_label as string,
      results,
    };
  }

  /**
  Extract system information from report
  */
  private static extractSystemInfo(frontmatter: Record<string, unknown>, markdown: string): SystemInfo
  {
    // Try to extract additional info from markdown if not in frontmatter
    let hostname = '';
    let osVersion = '';
    let freeMemoryGb = 0;

    const sysInfoSection = markdown.match(/## System Information([\s\S]*?)(?=##|$)/);
    if (sysInfoSection)
    {
      const hostnameMatch = sysInfoSection[1].match(/\*\*Hostname\*\*: (.+)/);
      if (hostnameMatch) hostname = hostnameMatch[1];

      const osMatch = sysInfoSection[1].match(/\*\*Platform\*\*: .+ \((.+)\)/);
      if (osMatch) osVersion = osMatch[1];

      const memoryMatch = sysInfoSection[1].match(/\*\*Memory\*\*: \d+ GB \((\d+) GB free\)/);
      if (memoryMatch) freeMemoryGb = parseInt(memoryMatch[1]);
    }

    return {
      platform: frontmatter.platform as string,
      arch: frontmatter.arch as string,
      cpu: frontmatter.cpu as string,
      memoryGb: frontmatter.memory_gb as number,
      freeMemoryGb: freeMemoryGb || 0,
      hostname: hostname || 'unknown',
      osVersion: osVersion || undefined,
      machineId: frontmatter.machine_id as string,
    };
  }

  /**
  Extract benchmark results from markdown table
  */
  private static extractBenchmarkResults(markdown: string): BenchmarkResult[]
  {
    const results: BenchmarkResult[] = [];

    // Find the benchmark results table
    const tableMatch = markdown.match(/## Benchmark Results[\s\S]*?\|(.*?)\|/g);
    if (!tableMatch) return results;

    // Parse table rows
    const lines = markdown.split('\n');
    let inTable = false;
    let skipHeader = true;

    for (const line of lines)
    {
      if (line.includes('| Benchmark | Duration (ms) |'))
      {
        inTable = true;
        continue;
      }

      if (inTable && line.startsWith('|---'))
      {
        skipHeader = false;
        continue;
      }

      if (inTable && !skipHeader && line.startsWith('|'))
      {
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);

        if (cells.length >= 4)
        {
          const name = cells[0];
          const duration = parseFloat(cells[1]);
          const opsPerSec = cells[2] === '-' ? undefined : parseFloat(cells[2]);
          const success = cells[3].includes('✅');
          const details = cells[4] || '';

          // Parse metadata from details
          const metadata: Record<string, unknown> = {};
          if (details.includes('mode'))
          {
            const modeMatch = details.match(/(\w+) mode/);
            if (modeMatch) metadata.mode = modeMatch[1];
          }
          if (details.includes('iterations'))
          {
            const iterMatch = details.match(/(\d+) iterations/);
            if (iterMatch) metadata.iterations = parseInt(iterMatch[1]);
          }
          if (details.includes('commands'))
          {
            const cmdMatch = details.match(/(\d+)\/(\d+) commands/);
            if (cmdMatch)
            {
              metadata.commandsExecuted = parseInt(cmdMatch[1]);
              metadata.totalCommands = parseInt(cmdMatch[2]);
            }
          }
          if (details.includes('failed at:'))
          {
            const failMatch = details.match(/failed at: (.+)/);
            if (failMatch) metadata.failedCommand = failMatch[1];
          }

          results.push({
            name,
            target: '', // Not stored in table, would need to enhance format
            duration,
            opsPerSecond: opsPerSec,
            success,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          });
        }
      }
      else if (inTable && !line.startsWith('|'))
      {
        // End of table
        break;
      }
    }

    // Extract error details if present
    const errorSection = markdown.match(/## Error Details([\s\S]*?)(?=##|$)/);
    if (errorSection)
    {
      for (const result of results)
      {
        if (!result.success)
        {
          const errorMatch = errorSection[1].match(new RegExp(`### ${result.name}\\s+Error: (.+)`));
          if (errorMatch)
          {
            result.error = errorMatch[1];
          }
        }
      }
    }

    return results;
  }

  /**
  Read and parse a report from file
  */
  static async parseReportFromFile(filepath: string): Promise<BenchmarkReport>
  {
    const content = await Deno.readTextFile(filepath);
    return this.parseMarkdownReport(content);
  }

  /**
  Parse multiple reports from files
  */
  static async parseMultipleReports(filepaths: string[]): Promise<BenchmarkReport[]>
  {
    const reports: BenchmarkReport[] = [];

    for (const filepath of filepaths)
    {
      try
      {
        const report = await this.parseReportFromFile(filepath);
        reports.push(report);
      }
      catch (error: unknown)
      {
        console.warn(`Failed to parse report ${filepath}:`, error);
      }
    }

    return reports;
  }
}
