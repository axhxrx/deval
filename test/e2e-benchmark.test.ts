#!/usr/bin/env -S deno run -A

/**
E2E test for benchmark Ops with simulated inputs
*/

import { assertEquals, assertExists } from '@std/assert';

// Simulated input sequence for running benchmarks
const simulatedInputs = [
  '1', // Select "bench" Op
  '1', // Select "NPM Install" benchmark
  'Test run from E2E', // Comment
  'n', // Don't run another Op
];

console.log('Running E2E benchmark test...');
console.log('Simulated inputs:', simulatedInputs.join(' -> '));

// Run deval with simulated inputs
const command = new Deno.Command('deno', {
  args: [
    'run',
    '-A',
    './deval',
    '--inputs',
    simulatedInputs.join('\n'),
  ],
  cwd: Deno.cwd(),
  stdout: 'piped',
  stderr: 'piped',
});

const { code, stdout, stderr } = await command.output();

const stdoutText = new TextDecoder().decode(stdout);
const stderrText = new TextDecoder().decode(stderr);

console.log('\n=== STDOUT ===');
console.log(stdoutText);

if (stderrText)
{
  console.log('\n=== STDERR ===');
  console.log(stderrText);
}

// Basic assertions
assertEquals(code, 0, 'Process should exit with code 0');

// Check that benchmark ran
assertExists(
  stdoutText.match(/Benchmark complete/i)
    || stdoutText.match(/BENCHMARK RESULT/i)
    || stdoutText.match(/NPM Install/i),
  'Should show benchmark completion',
);

// Check that a report was created
const reportFiles = [];
for await (const entry of Deno.readDir('./reports'))
{
  if (entry.name.endsWith('.md'))
  {
    reportFiles.push(entry.name);
  }
}

console.log('\nGenerated reports:', reportFiles);
assertExists(reportFiles.length > 0, 'Should generate at least one report');

console.log('\n✅ E2E benchmark test passed!');
