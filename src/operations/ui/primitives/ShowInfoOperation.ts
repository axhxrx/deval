import { unifiedPrompt } from '../../../runtime/prompts/unifiedPrompt.ts';
import { UserInputType } from '../../../runtime/types.ts';
import type { OperationResult } from '../../base/types.ts';
import { UIOperation } from '../../base/UIOperation.ts';

/**
Display information and wait for user acknowledgment

This operation:
- Shows formatted content to the user
- Waits for Enter/confirmation to continue
- Returns void (no data)
- Useful for help text, status displays, etc.
*/
export class ShowInfoOperation extends UIOperation<void>
{
  constructor(
    private readonly title: string,
    private readonly content: string | string[],
    private readonly boxed: boolean = false,
  )
  {
    super(`Show info: ${title}`);
  }

  protected async performOperation(): Promise<OperationResult<void>>
  {
    try
    {
      // Display the content
      if (this.boxed)
      {
        this.displayBoxed();
      }
      else
      {
        this.displaySimple();
      }

      // Display prompt message before waiting
      console.log('\nPress Enter to continue...');

      // Wait for acknowledgment
      await unifiedPrompt<boolean>({
        message: 'Press Enter to continue...',
        inputType: UserInputType.Confirm,
        interactive: () =>
        {
          // Just wait for Enter key
          prompt('');
          return true;
        },
      });

      return { success: true, data: undefined };
    }
    catch (error: unknown)
    {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during info display',
      };
    }
  }

  private displaySimple(): void
  {
    console.log(`\n${this.title}`);
    console.log('='.repeat(this.title.length));

    const lines = Array.isArray(this.content) ? this.content : [this.content];
    for (const line of lines)
    {
      console.log(line);
    }
  }

  private displayBoxed(): void
  {
    const lines = Array.isArray(this.content) ? this.content : this.content.split('\n');
    const allLines = [this.title, '', ...lines];

    // Find the longest line
    const maxLength = Math.max(...allLines.map(l => l.length));
    const boxWidth = maxLength + 4; // 2 spaces padding on each side

    // Top border
    console.log('╔' + '═'.repeat(boxWidth) + '╗');

    // Title
    const titlePadding = boxWidth - this.title.length - 2;
    const leftPad = Math.floor(titlePadding / 2);
    const rightPad = titlePadding - leftPad;
    console.log('║ ' + ' '.repeat(leftPad) + this.title + ' '.repeat(rightPad) + ' ║');

    // Separator after title
    console.log('╟' + '─'.repeat(boxWidth) + '╢');

    // Content lines
    for (const line of lines)
    {
      const padding = boxWidth - line.length - 2;
      console.log('║ ' + line + ' '.repeat(padding) + ' ║');
    }

    // Bottom border
    console.log('╚' + '═'.repeat(boxWidth) + '╝');
  }
}
