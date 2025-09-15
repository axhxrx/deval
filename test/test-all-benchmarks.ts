#!/usr/bin/env -S deno run -A

/**
Test all benchmark operations individually
*/

import { BuildAPIClientBenchmarkOperation } from '../src/operations/benchmarks/BuildAPIClientBenchmarkOperation.ts';
import { BuildReactAppBenchmarkOperation } from '../src/operations/benchmarks/BuildReactAppBenchmarkOperation.ts';
import { DockerComposeBenchmarkOperation } from '../src/operations/benchmarks/DockerComposeBenchmarkOperation.ts';
import { NPMInstallBenchmarkOperation } from '../src/operations/benchmarks/NPMInstallBenchmarkOperation.ts';
import { NPMRemoveNodeModulesBenchmarkOperation } from '../src/operations/benchmarks/NPMRemoveNodeModulesBenchmarkOperation.ts';
import { PNPMInstallBenchmarkOperation } from '../src/operations/benchmarks/PNPMInstallBenchmarkOperation.ts';

const benchmarks = [
  {
    name: 'NPM Install',
    operation: new NPMInstallBenchmarkOperation({ quick: true }),
  },
  {
    name: 'NPM Remove node_modules',
    operation: new NPMRemoveNodeModulesBenchmarkOperation({ quick: true }),
  },
  {
    name: 'Build React App',
    operation: new BuildReactAppBenchmarkOperation({ quick: true }),
  },
  {
    name: 'Build API Client',
    operation: new BuildAPIClientBenchmarkOperation({ quick: true }),
  },
  {
    name: 'PNPM Install',
    operation: new PNPMInstallBenchmarkOperation({ quick: true }),
  },
  {
    name: 'Docker Compose',
    operation: new DockerComposeBenchmarkOperation({ quick: true }),
    skipIfNoDocker: true,
  },
];

console.log('🧪 Testing all benchmark operations individually...\n');

const results = [];

for (const benchmark of benchmarks)
{
  console.log(`\n📊 Testing: ${benchmark.name}`);
  console.log('─'.repeat(50));

  // Check if Docker is available for Docker-based benchmarks
  if (benchmark.skipIfNoDocker)
  {
    try
    {
      const dockerCheck = new Deno.Command('docker', {
        args: ['--version'],
        stdout: 'piped',
        stderr: 'piped',
      });
      await dockerCheck.output();
    }
    catch
    {
      console.log('⚠️  Docker not available, skipping Docker Compose test');
      results.push({
        name: benchmark.name,
        status: 'skipped',
        reason: 'Docker not available',
      });
      continue;
    }
  }

  try
  {
    const result = await benchmark.operation.execute();

    if (result.success)
    {
      console.log('✅ Success!');
      console.log(`   Time: ${result.data?.duration ?? 'N/A'}ms`);
      console.log(`   Metadata: ${JSON.stringify(result.data?.metadata)}`);
      results.push({
        name: benchmark.name,
        status: 'success',
        time: result.data?.duration,
      });
    }
    else
    {
      console.log('❌ Failed!');
      console.log(`   Error: ${result.error}`);
      results.push({
        name: benchmark.name,
        status: 'failed',
        error: result.error,
      });
    }
  }
  catch (error)
  {
    console.log('💥 Exception!');
    console.log(`   Error: ${error}`);
    results.push({
      name: benchmark.name,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Summary
console.log('\n\n📊 TEST SUMMARY');
console.log('═'.repeat(50));

const successful = results.filter(r => r.status === 'success').length;
const failed = results.filter(r => r.status === 'failed').length;
const errors = results.filter(r => r.status === 'error').length;
const skipped = results.filter(r => r.status === 'skipped').length;

console.log(`\n✅ Successful: ${successful}`);
console.log(`❌ Failed: ${failed}`);
console.log(`💥 Errors: ${errors}`);
console.log(`⚠️  Skipped: ${skipped}`);

console.log('\n\nDetailed Results:');
for (const result of results)
{
  const icon = result.status === 'success'
    ? '✅'
    : result.status === 'failed'
    ? '❌'
    : result.status === 'error'
    ? '💥'
    : '⚠️';
  console.log(`${icon} ${result.name}: ${result.status}`);
  if (result.time)
  {
    console.log(`   Time: ${result.time}ms`);
  }
  if (result.error)
  {
    console.log(`   Error: ${result.error}`);
  }
  if (result.reason)
  {
    console.log(`   Reason: ${result.reason}`);
  }
}

// Exit with error code if any tests failed
if (failed > 0 || errors > 0)
{
  console.log('\n❌ Some tests failed!');
  Deno.exit(1);
}
else
{
  console.log('\n✅ All tests passed!');
}
