import { assertNever } from '@axhxrx/assert-never';
import { promptSelect } from '../../runtime/prompt.ts';
import { MenuOperation } from '../base/MenuOperation.ts';
import type { OperationResult } from '../base/types.ts';
import { BenchOperation } from './BenchOperation.ts';
import { CompareOperation } from './CompareOperation.ts';
import { DisplayFatalErrorAndExit } from './DisplayFatalErrorAndExit.ts';
import { ExitNormally } from './ExitNormally.ts';

// NOTE: We will want to rework menus to be more self-checking. Maybe a Menu and MenuItem class/type and a handler function type to not make the types require all this shitty boiler plate.
// I tried making a menu on object, but I realized that there is a need to sometimes know the chosen item, and then some other stufff, before constructing the result operation. But we could handle that by standarding the context passed back to the function maybe, instead of making the menu definition an array of titles, and then a handler function that is exhaustive (and causes more type fuckery and workarounds), Maybe we design this soon but not yet, for now this works:
//
const menu = [
  '🚀 Run benchmarks',
  '📊 Compare results',
  '💣 Display fatal error and exit',
  '👋 Just exit normally',
] as const;

type MenuItem = typeof menu[number];

const isValidMenuItem = (value: unknown): value is MenuItem =>
  value as MenuItem && typeof value === 'string' && menu.includes(value as MenuItem);

const handleMenuSelection = (label: MenuItem) =>
{
  switch (label)
  {
    case '🚀 Run benchmarks':
      return new BenchOperation();
    case '📊 Compare results':
      return new CompareOperation();
    case '💣 Display fatal error and exit':
      return new DisplayFatalErrorAndExit('You have chosen to display a fatal error and exit.');
    case '👋 Just exit normally':
      return new ExitNormally();
    default:
      assertNever(label);
      throw new Error(`Unknown menu option: ${label}`);
  }
};

// Type that extracts the return types of all value functions in the menu object
type MenuLeafReturnTypes = ReturnType<typeof handleMenuSelection>;

// Union type of all possible operations the main menu can return
export type MainMenuOperationResult = MenuLeafReturnTypes;

export class MainMenuOperation extends MenuOperation<MainMenuOperationResult>
{
  constructor()
  {
    super('Main menu');
  }

  protected async performOperation(): Promise<OperationResult<MainMenuOperationResult>>
  {
    await Promise.resolve();

    const chosen = promptSelect(
      'MAIN MENU',
      [...menu], // sucks but promptSelect can't accept a readonly array T_T
    );

    if (!isValidMenuItem(chosen))
    {
      return { success: false, error: 'shit' };
    }

    const result = handleMenuSelection(chosen);
    return { success: true, data: result };
  }
}
