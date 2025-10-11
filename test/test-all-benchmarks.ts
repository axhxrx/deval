#!/usr/bin/env -S deno run -A

/**
Test all benchmark Ops individually
*/

import { BuildAPIClientBenchmarkOp } from '../src/ops/benchmarks/BuildAPIClientBenchmarkOp.ts';
import { BuildReactAppBenchmarkOp } from '../src/ops/benchmarks/BuildReactAppBenchmarkOp.ts';
import { DockerComposeBenchmarkOp } from '../src/ops/benchmarks/DockerComposeBenchmarkOp.ts';
import { NPMInstallBenchmarkOp } from '../src/ops/benchmarks/NPMInstallBenchmarkOp.ts';
import { NPMRemoveNodeModulesBenchmarkOp } from '../src/ops/benchmarks/NPMRemoveNodeModulesBenchmarkOp.ts';
import { PNPMInstallBenchmarkOp } from '../src/ops/benchmarks/PNPMInstallBenchmarkOp.ts';

const benchmarks = [
  {
    name: 'NPM Install',
    Op: new NPMInstallBenchmarkOp({ quick: true }),
  },
  {
    name: 'NPM Remove node_modules',
    Op: new NPMRemoveNodeModulesBenchmarkOp({ quick: true }),
  },
  {
    name: 'Build React App',
    Op: new BuildReactAppBenchmarkOp({ quick: true }),
  },
  {
    name: 'Build API Client',
    Op: new BuildAPIClientBenchmarkOp({ quick: true }),
  },
  {
    name: 'PNPM Install',
    Op: new PNPMInstallBenchmarkOp({ quick: true }),
  },
  {
    name: 'Docker Compose',
    Op: new DockerComposeBenchmarkOp({ quick: true }),
    skipIfNoDocker: true,
  },
];

console.log('🧪 Testing all benchmark Ops individually...\n');

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
    const result = await benchmark.Op.run();

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
