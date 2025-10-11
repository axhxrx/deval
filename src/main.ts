import '@std/dotenv/load';
import { displayHelp, parseCliArgs } from './cli/parser.ts';
import type { BenchOptions, CompareOptions } from './cli/types.ts';
import { Logger } from './logger/logger.ts';
import { BenchOp } from './ops/ui/BenchOp.ts';
import { CompareOp } from './ops/ui/CompareOp.ts';
import { MainMenuOp } from './ops/ui/MainMenuOp.ts';
import { OpStack } from './runtime/OpStack.ts';
import { initUserInputQueue } from './runtime/UserInputQueue.ts';

/**
Main application entry point
*/
async function main(): Promise<void>
{
  // Initialize Logger as the very first thing
  await Logger.initialize();

  // Parse command line arguments
  const args = parseCliArgs();

  // Handle help flag
  if (args.help)
  {
    displayHelp();
    Deno.exit(0);
  }

  // Initialize user input queue if simulated inputs provided
  if (args.inputs)
  {
    initUserInputQueue(args.inputs);
    await Logger.info(`Initialized with simulated inputs: ${args.inputs}`);
  }

  // Handle direct command execution
  if (args.command)
  {
    let Op;

    switch (args.command)
    {
      case 'bench':
        Op = new BenchOp(args.options as BenchOptions);
        break;
      case 'compare':
        Op = new CompareOp(args.options as CompareOptions);
        break;
    }

    if (Op)
    {
      await OpStack.run(Op);
      Deno.exit(0);
    }
  }

  // No command specified, show interactive menu
  console.log(`
╔════════════════════════════════════════╗
║          deval - Dev Evaluator         ║
║   Environment Benchmarking Tool v0.0.1 ║
╚════════════════════════════════════════╝
  `);

  // Main menu loop
  while (true)
  {
    const menuOp = new MainMenuOp();
    const menuResult = await menuOp.run();

    if (!menuResult.success)
    {
      // Catastrophic menu failure - this should basically never happen
      await Logger.error('FATAL: Menu Op failed', menuResult.error);
      console.error('Menu system error:', menuResult.error);
      continue; // Try to show menu again
    }

    if (!menuResult.data)
    {
      // User selected exit
      break;
    }

    // Run the Op chain
    await OpStack.run(menuResult.data);
    // Loop back to show menu again
  }
}

if (import.meta.main)
{
  try
  {
    await main();
  }
  catch (error: unknown)
  {
    const errorMessage = error instanceof Error ? error.message : `Unknown error: ${error}`;
    await Logger.error('Fatal error', error);
    console.error('Fatal error occurred:', errorMessage);
    Deno.exit(1);
  }
}
