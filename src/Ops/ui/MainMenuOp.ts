import { assertNever } from '@axhxrx/assert-never';
import { MenuOp } from '../base/MenuOp.ts';
import type { Outcome } from '../base/types.ts';
import { CompareOp } from './CompareOp.ts';
import { DisplayFatalErrorAndExit } from './DisplayFatalErrorAndExit.ts';
import { ExitNormally } from './ExitNormally.ts';
import { BenchmarkOptionsMenuOp } from './menus/BenchmarkOptionsMenuOp.ts';
import { SelectOp } from './primitives/SelectOp.ts';

// NOTE: We will want to rework menus to be more self-checking. Maybe a Menu and MenuItem class/type and a handler function type to not make the types require all this shitty boiler plate.
// I tried making a menu on object, but I realized that there is a need to sometimes know the chosen item, and then some other stufff, before constructing the result Op. But we could handle that by standarding the context passed back to the function maybe, instead of making the menu definition an array of titles, and then a handler function that is exhaustive (and causes more type fuckery and workarounds), Maybe we design this soon but not yet, for now this works:
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
      return new BenchmarkOptionsMenuOp();
    case '📊 Compare results':
      return new CompareOp();
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

// Union type of all possible Ops the main menu can return
export type MainMenuOutcome = MenuLeafReturnTypes;

export class MainMenuOp extends MenuOp<MainMenuOutcome>
{
  constructor()
  {
    super('Main menu');
  }

  protected async performOp(): Promise<Outcome<MainMenuOutcome>>
  {
    // Use SelectOp primitive instead of direct prompt
    const selectOp = new SelectOp('MAIN MENU', menu, false);
    const selectResult = await selectOp.run();

    if (!selectResult.success)
    {
      return { success: false, error: selectResult.error || 'Menu selection failed' };
    }

    const chosen = selectResult.data;
    if (!chosen || !isValidMenuItem(chosen))
    {
      return { success: false, error: 'Invalid menu selection' };
    }

    const result = handleMenuSelection(chosen);
    return { success: true, data: result };
  }
}
