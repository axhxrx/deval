import type { BenchOptions } from '../../../cli/types.ts';
import { MenuOperation } from '../../base/MenuOperation.ts';
import type { OperationResult } from '../../base/types.ts';
import { BenchOperation } from '../BenchOperation.ts';
import { ConfirmOperation } from '../primitives/ConfirmOperation.ts';
import { InputMultipleTextOperation } from '../primitives/InputMultipleTextOperation.ts';
import { SelectOperation } from '../primitives/SelectOperation.ts';

/**
Target directory with label for benchmarking
*/
export interface BenchmarkTarget
{
  label: string;
  path: string;
}

/**
Submenu operation for configuring benchmark options

This operation:
- Allows toggling between quick and full mode
- Supports adding multiple target directories with labels
- Shows current configuration state
- Returns configured BenchOperation or null on cancellation
*/
export class BenchmarkOptionsMenuOperation extends MenuOperation<BenchOperation | null>
{
  private mode: 'quick' | 'full' = 'full';
  private targets: BenchmarkTarget[] = [];

  constructor()
  {
    super('Benchmark Options');

    // Add current directory as default target
    this.targets.push({
      label: 'Current Directory',
      path: Deno.cwd(),
    });
  }

  protected async performOperation(): Promise<OperationResult<BenchOperation | null>>
  {
    while (true)
    {
      // Display current configuration
      console.log('\n🚀 BENCHMARK CONFIGURATION');
      console.log('════════════════════════════════════════');
      console.log(`Mode: ${this.mode === 'quick' ? '⚡ Quick (100 files)' : '📊 Full (1000 files)'}`);
      console.log('\nTarget directories:');

      for (const target of this.targets)
      {
        console.log(`  • ${target.label}: ${target.path}`);
      }

      // Build dynamic menu options
      const menuOptions: string[] = [];

      // Mode toggle option changes based on current mode
      if (this.mode === 'full')
      {
        menuOptions.push('⚡ Switch to quick mode');
      }
      else
      {
        menuOptions.push('📊 Switch to full mode');
      }

      menuOptions.push('➕ Add target directory');

      if (this.targets.length > 1)
      {
        menuOptions.push('➖ Remove target directory');
      }

      menuOptions.push('✅ Start benchmarks');
      menuOptions.push('↩️  Go back');

      // Show menu
      const selectOp = new SelectOperation('', menuOptions as any, false);
      const result = await selectOp.execute();

      if (!result.success || !result.data)
      {
        return { success: true, data: null };
      }

      const choice = result.data;

      // Handle menu selection
      if (choice.includes('Switch to quick'))
      {
        this.mode = 'quick';
      }
      else if (choice.includes('Switch to full'))
      {
        this.mode = 'full';
      }
      else if (choice.includes('Add target'))
      {
        const addResult = await this.addTarget();
        if (!addResult)
        {
          // User cancelled, continue showing menu
          continue;
        }
      }
      else if (choice.includes('Remove target'))
      {
        await this.removeTarget();
      }
      else if (choice.includes('Start benchmarks'))
      {
        // Create BenchOperation with configured options
        const options: BenchOptions = {
          targets: this.targets.map(t => t.path),
          quick: this.mode === 'quick',
        };

        // Confirm before starting
        const confirmOp = new ConfirmOperation(
          `Start ${this.mode} benchmarks on ${this.targets.length} target(s)?`,
        );
        const confirmResult = await confirmOp.execute();

        if (confirmResult.success && confirmResult.data === true)
        {
          return {
            success: true,
            data: new BenchOperation(options),
          };
        }
      }
      else if (choice.includes('Go back'))
      {
        return { success: true, data: null };
      }
    }
  }

  private async addTarget(): Promise<boolean>
  {
    const inputOp = new InputMultipleTextOperation(
      'Add Benchmark Target',
      [
        {
          key: 'label',
          message: 'Enter a label for this target (e.g., "Docker Volume", "NFS Mount")',
          required: true,
        },
        {
          key: 'path',
          message: 'Enter the directory path',
          required: true,
          validation: {
            validator: (value) =>
            {
              // Check if path exists
              try
              {
                const stat = Deno.statSync(value);
                if (!stat.isDirectory)
                {
                  return 'Path must be a directory';
                }
                return true;
              }
              catch
              {
                return 'Path does not exist or is not accessible';
              }
            },
          },
        },
      ],
    );

    const result = await inputOp.execute();

    if (result.success && result.data)
    {
      this.targets.push({
        label: result.data.label,
        path: result.data.path,
      });
      return true;
    }

    return false;
  }

  private async removeTarget(): Promise<void>
  {
    if (this.targets.length <= 1)
    {
      console.log('\n⚠️  Cannot remove the last target');
      return;
    }

    // Build list of removable targets (all except current directory if it's the only one)
    const options = this.targets.map(t => `${t.label} (${t.path})`);

    const selectOp = new SelectOperation(
      'Select target to remove',
      options as any,
      true,
    );

    const result = await selectOp.execute();

    if (result.success && result.data)
    {
      const index = options.indexOf(result.data);
      if (index >= 0)
      {
        this.targets.splice(index, 1);
      }
    }
  }
}

// Make it runnable as a standalone program
if (import.meta.main)
{
  const menuOp = new BenchmarkOptionsMenuOperation();
  const result = await menuOp.execute();

  if (result.success && result.data)
  {
    console.log('\n📋 Would run BenchOperation with the configured options');
    console.log('To actually run it, execute the result.data operation');
    console.log('result:', result);
  }
  else
  {
    console.log('\n❌ Benchmark configuration cancelled');
  }
}
