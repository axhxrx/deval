import { parseArgs } from '@std/cli/parse-args';
import type { BenchOptions, CompareOptions, ParsedArgs } from './types.ts';

/**
Parse command line arguments
*/
export function parseCliArgs(args: string[]): ParsedArgs
{
  // First, check if there's a command
  const [command, ...rest] = args;

  if (!command || command.startsWith('-'))
  {
    // No command provided, parse global options only
    const flags = parseArgs(args, {
      string: ['inputs'],
      boolean: ['help'],
      alias: {
        h: 'help',
        i: 'inputs',
      },
    });

    return {
      inputs: flags.inputs,
      help: flags.help,
    };
  }

  switch (command)
  {
    case 'bench':
    {
      const flags = parseArgs(rest, {
        string: ['target', 'inputs'],
        boolean: ['quick', 'something-else', 'help'],
        collect: ['target'],
        alias: {
          t: 'target',
          q: 'quick',
          h: 'help',
        },
      });

      const benchOptions: BenchOptions = {
        targets: (flags.target as string[]) || [],
        quick: flags.quick,
        somethingElse: flags['something-else'],
      };

      return {
        command: 'bench',
        options: benchOptions,
        inputs: flags.inputs,
        help: flags.help,
      };
    }

    case 'compare':
    {
      const flags = parseArgs(rest, {
        string: ['inputs'],
        boolean: ['update', 'help'],
        alias: {
          u: 'update',
          h: 'help',
        },
      });

      const compareOptions: CompareOptions = {
        update: flags.update,
        files: flags._ as string[],
      };

      return {
        command: 'compare',
        options: compareOptions,
        inputs: flags.inputs,
        help: flags.help,
      };
    }

    default:
      // Unknown command, treat as global options
      return parseCliArgs(['--help']);
  }
}

/**
Display help message
*/
export function displayHelp(): void
{
  console.log(`
deval - Developer environment evaluation and benchmarking tool

USAGE:
  deval [COMMAND] [OPTIONS]
  deval [--inputs <simulated>]

COMMANDS:
  bench     Run benchmarks on specified targets
  compare   Compare benchmark results

GLOBAL OPTIONS:
  --inputs, -i <string>   Simulated user inputs (e.g., "select:0,select:1")
  --help, -h              Show this help message

BENCH OPTIONS:
  --target, -t <path>     Target directory to benchmark (can be specified multiple times)
  --quick, -q             Run in quick mode
  --something-else        Do something else

COMPARE OPTIONS:
  --update, -u            Update the benchmark for this machine
  <files...>              Benchmark files to compare

EXAMPLES:
  deval bench --target foo/bar --target baz/hoge --quick
  deval compare --update machine1.deval.md machine2.deval.md
  deval --inputs "select:0,select:1"
  `);
}
