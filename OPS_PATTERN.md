# Ops Pattern Guide for deval

## Overview

The deval project uses an **Ops Pattern** - a composable, chainable architecture for building CLI applications where every action is an Op. Ops can be UI interactions, business logic, or compositions of other Ops.

## Core Concepts

### 1. Everything is an Op

Ops are the fundamental building blocks of the application. They:
- Encapsulate a single unit of work
- Return a standardized `Outcome<T>`
- Can be composed into chains
- Are independently testable and runnable

### 2. Op Types

```
BaseOp (abstract)
├── UIOp (for user interactions)
│   └── UI Primitives (SelectOp, InputTextOp, etc.)
├── MenuOp (for menu systems)
│   └── MainMenuOp, BenchmarkOptionsMenuOp
└── Business Ops
    └── BenchOp, CompareOp
```

### 3. Op Chaining

Ops naturally chain together:
```typescript
MainMenuOp → BenchmarkOptionsMenuOp → BenchOp
```

The `OpStack` runs ops based on a stack, where each Op can return another Op to push onto the stack and run next.

## Key Implementation Details

### Op Result Pattern

Every Op returns:
```typescript
interface Outcome<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### UI Primitives

Located in `src/ops/ui/primitives/`:
- **InputTextOp**: Text input with validation
- **SelectOp**: Choice from list
- **ConfirmOp**: Yes/No/More Info
- **ShowInfoOp**: Display information
- **InputPasswordOp**: Masked password input
- **InputMultipleTextOp**: Multi-field forms

### Simulated Input System

Ops support both interactive and automated modes:
```typescript
// Interactive mode
const op = new InputTextOp("Enter name");
const result = await op.run();

// Automated mode with simulated inputs
initUserInputQueue('input:"Alice"');
const result = await op.run(); // Uses simulated input
```

### Ops as Standalone Programs

Every Op can run independently:
```bash
# Run an Op directly
deno run src/ops/ui/primitives/SelectOp.ts

# Run with simulated inputs for testing
deno run src/ops/ui/primitives/SelectOp.ts --inputs "select:2"
```

This is achieved with:
```typescript
if (import.meta.main) {
  const op = new MyOp();
  const result = await op.run();
  console.log('RESULT:', result);
}
```

## Testing Strategy

### Test Organization
- Tests live next to their Ops: `Op.ts` → `Op.test.ts`
- Fixtures in `test/fixture/` directory
- Shared test helpers in `src/ops/ui/test-helpers.ts`

### Test Pattern
```typescript
Deno.test('Op test', async () => {
  const output = await captureOutput(async () => {
    initUserInputQueue('input:"test"');
    const op = new MyOp();
    const result = await op.run();
    // Assert on result
  });

  const expected = await readFixture('MyOp');
  assertEquals(normalizeOutput(output), normalizeOutput(expected));
});

// Prevent signal handler issues in tests
Deno.test.beforeAll(() => {
  SubLoggerManager.initialize({ suppressSignalHandlers: true });
});
```

### Generating Fixtures
```bash
deno run src/ops/ui/primitives/MyOp.ts --inputs "input:'test'" > test/fixture/MyOp.fixture.txt
```

## Creating New Ops

### 1. Basic Op
```typescript
export class MyOp extends BaseOp<string> {
  constructor(private options: MyOptions) {
    super('My Op');
  }

  protected async performOp(): Promise<Outcome<string>> {
    // Your logic here
    return { success: true, data: 'result' };
  }
}
```

### 2. UI Op
```typescript
export class MyUIOp extends UIOp<string> {
  protected async performOp(): Promise<Outcome<string>> {
    // Check for simulated input
    const simulatedInput = getNextSimulatedInput('input');

    if (simulatedInput) {
      console.log(`> ${simulatedInput.value}`);
      return { success: true, data: simulatedInput.value };
    } else {
      // Interactive mode
      const value = prompt('>');
      return { success: true, data: value };
    }
  }
}
```

### 3. Menu Op
```typescript
export class MyMenuOp extends MenuOp<Op | null> {
  protected async performOp(): Promise<Outcome<Op | null>> {
    const selectOp = new SelectOp('Choose', ['Option 1', 'Option 2']);
    const result = await selectOp.run();

    if (result.success && result.data === 'Option 1') {
      return { success: true, data: new SomeOp() };
    }

    return { success: true, data: null };
  }
}
```

## Benefits of the Ops Pattern

1. **Composability**: Ops combine like LEGO blocks
2. **Testability**: Each Op is independently testable with fixtures
3. **Debuggability**: Run any Op standalone to debug
4. **Consistency**: Uniform interface for all actions
5. **Automation**: Built-in support for simulated inputs
6. **Type Safety**: Full TypeScript support throughout

## Common Patterns

### Validation with Retry
```typescript
if (validationError) {
  console.warn(validationError);
  return await this.performOp(); // Recurse to retry
}
```

### Submenu Navigation
```typescript
// Main menu returns submenu Op
case 'Configure':
  return new ConfigurationMenuOp();

// Submenu returns configured Op
case 'Start':
  return new ConfiguredOp(this.config);
```

### Op Chains
```typescript
// Ops return next Op in chain
const nextOp = new NextOp(this.data);
return { success: true, data: nextOp };
```

## Tips for Future Development

1. **Keep Ops focused**: One Op, one responsibility
2. **Use UI primitives**: Don't reinvent the wheel for common UI patterns
3. **Test with fixtures**: Generate and maintain fixture files for consistent testing
4. **Support both modes**: Always support interactive and simulated inputs
5. **Make Ops runnable**: Add `if (import.meta.main)` blocks for debugging
6. **Chain thoughtfully**: Design Op chains that make sense to users

## Example: Adding a New Feature

To add a new feature (e.g., "analyze" command):

1. Create the business Op:
```typescript
// src/ops/AnalyzeOp.ts
export class AnalyzeOp extends BaseOp<AnalysisResult> {
  // Implementation
}
```

2. Create configuration menu if needed:
```typescript
// src/ops/ui/menus/AnalyzeOptionsMenuOp.ts
export class AnalyzeOptionsMenuOp extends MenuOp<AnalyzeOp | null> {
  // Collect options, return configured AnalyzeOp
}
```

3. Add to main menu:
```typescript
// src/ops/ui/MainMenuOp.ts
case '🔍 Analyze':
  return new AnalyzeOptionsMenuOp();
```

4. Create tests with fixtures:
```typescript
// src/ops/AnalyzeOp.test.ts
Deno.test('AnalyzeOp test', async () => {
  // Test implementation
});
```

5. Generate fixture:
```bash
deno run src/ops/AnalyzeOp.ts --inputs "..." > test/fixture/AnalyzeOp.fixture.txt
```

## Conclusion

The Ops Pattern provides a powerful, flexible foundation for building complex CLI applications. By treating everything as a composable Op, the codebase remains maintainable, testable, and extensible.
