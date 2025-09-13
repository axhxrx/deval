import '@std/dotenv/load';
import { Logger } from './logger/logger.ts';
import type { BaseOperation } from './operations/base/BaseOperation.ts';
import { isOperation } from './operations/base/isOperation.ts';
import { MainMenuOperation } from './operations/ui/MainMenuOperation.ts';

/**
 Execute a chain of operations recursively

 Operations can return other operations, creating a chain.
 The chain continues until an operation returns null or non-operation data.

 Operations are responsible for their own UI and error handling.
 This function only handles catastrophic failures.
 */
async function executeOperationChain(operation: BaseOperation<unknown>): Promise<void>
{
  try
  {
    const result = await operation.execute();

    // Only continue chain if we got another operation
    if (result.success && result.data && isOperation(result.data))
    {
      await executeOperationChain(result.data);
    }
    // Otherwise done - operation handled everything internally
  }
  catch (error: unknown)
  {
    // Catastrophic failure - log and show error
    await Logger.error('FATAL: Operation crashed', error);
    console.error('Operation crashed', [
      error instanceof Error ? error.message : 'Unknown error',
      'The operation could not complete due to an unexpected error.',
    ]);
  }
}

/**
 Main application entry point
 */
async function main(): Promise<void>
{
  // Initialize Logger as the very first thing
  await Logger.initialize();

  // Add this back later:
  // const initResult = await AppInitOperation.execute();

  // if (!initResult.success)
  // {
  //   await Logger.error('Failed to initialize app', initResult.error);
  //   Deno.exit(1);
  // }

  // Main menu loop
  while (true)
  {
    const menuOp = new MainMenuOperation();
    const menuResult = await menuOp.execute();

    if (!menuResult.success)
    {
      // Catastrophic menu failure - this should basically never happen
      await Logger.error('FATAL: Menu operation failed', menuResult.error);
      await displayErrorBanner('Menu system error', [
        menuResult.error,
        'The menu system encountered an unexpected error.',
      ]);
      continue; // Try to show menu again
    }

    if (!menuResult.data)
    {
      // User selected exit
      break;
    }

    // Execute the operation chain
    await executeOperationChain(menuResult.data);
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
    await displayErrorBanner('Fatal error occurred', [errorMessage]);

    await SessionRecorder.getInstance().stopRecording({
      completedSuccessfully: false,
      errorOccurred: true,
      error: errorMessage,
    });
    Deno.exit(1);
  }
}
