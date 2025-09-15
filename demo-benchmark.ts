#!/usr/bin/env -S deno run --allow-all

/**
Demo script to showcase the benchmark system
*/

import { FileIOBenchmark } from './src/benchmarks/fileIO.ts';
import type { BenchmarkReport } from './src/benchmarks/types.ts';
import { BenchmarkReportParser } from './src/reports/BenchmarkReportParser.ts';
import { BenchmarkReportWriter } from './src/reports/BenchmarkReportWriter.ts';
import { HTMLReportGenerator } from './src/reports/html/HTMLReportGenerator.ts';
import { SystemInfoCollector } from './src/utils/SystemInfoCollector.ts';

console.log('🚀 Deval Benchmark System Demo');
console.log('================================\n');

// Get system info
console.log('📊 Collecting system information...');
const systemInfo = await SystemInfoCollector.getSystemInfo();
console.log(`   Platform: ${systemInfo.platform}`);
console.log(`   CPU: ${systemInfo.cpu}`);
console.log(`   Memory: ${systemInfo.memoryGb} GB (${systemInfo.freeMemoryGb} GB free)`);
console.log(`   Machine ID: ${systemInfo.machineId}\n`);

// Run a sample benchmark
console.log('🏃 Running File I/O benchmark...');
const fileIOBenchmark = new FileIOBenchmark();
const result = await fileIOBenchmark.run(Deno.cwd(), true);

// Enhance result with additional info
result.filesystemLabel = SystemInfoCollector.getFilesystemLabel(Deno.cwd());
result.timestamp = new Date();

console.log(`   Result: ${result.success ? '✅ Success' : '❌ Failed'}`);
console.log(`   Duration: ${result.duration.toFixed(2)}ms`);
if (result.opsPerSecond)
{
  console.log(`   Performance: ${result.opsPerSecond.toFixed(2)} ops/sec`);
}
console.log('');

// Create a benchmark report
const report: BenchmarkReport = {
  reportVersion: '1.0.0',
  machineId: systemInfo.machineId,
  timestamp: new Date(),
  systemInfo,
  userComment: 'Demo benchmark run',
  filesystemLabel: result.filesystemLabel || 'Unknown',
  results: [result],
};

// Generate markdown report
console.log('📝 Generating markdown report...');
const markdownContent = BenchmarkReportWriter.generateMarkdownReport(report);
const reportFilename = BenchmarkReportWriter.generateReportFilename(report);
await BenchmarkReportWriter.writeReportToFile(report, reportFilename);
console.log(`   Saved to: ${reportFilename}\n`);

// Show a preview of the markdown
console.log('📄 Markdown Report Preview:');
console.log('----------------------------');
const lines = markdownContent.split('\n');
console.log(lines.slice(0, 30).join('\n'));
console.log('... [truncated]');
console.log('');

// Parse the report back
console.log('🔍 Parsing the report back...');
const parsedReport = await BenchmarkReportParser.parseReportFromFile(reportFilename);
console.log(`   Report version: ${parsedReport.reportVersion}`);
console.log(`   Machine ID: ${parsedReport.machineId}`);
console.log(`   Results count: ${parsedReport.results.length}`);
console.log('');

// Generate HTML comparison
console.log('🌐 Generating HTML report...');
const htmlFilename = `demo_benchmark_${Date.now()}.html`;
await HTMLReportGenerator.writeHTMLReport([report], htmlFilename);
console.log(`   Saved to: ${htmlFilename}`);
console.log('   Open this file in a browser to see interactive charts!');
console.log('');

console.log('✨ Demo complete!');
console.log('================================');
console.log('\nTo use the full benchmark system, run:');
console.log('   deno run -A main.ts bench');
console.log('\nTo compare multiple reports, run:');
console.log('   deno run -A main.ts compare benchmark_*.md');
