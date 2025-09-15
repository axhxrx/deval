# Operations Pattern Guide for deval

## Overview

The deval project uses an **Operations Pattern** - a composable, chainable architecture for building CLI applications where every action is an operation. Operations can be UI interactions, business logic, or compositions of other operations.

## Core Concepts

### 1. Everything is an Operation

Operations are the fundamental building blocks of the application. They:
- Encapsulate a single unit of work
- Return a standardized `OperationResult<T>`
- Can be composed into chains
- Are independently testable and runnable

### 2. Operation Types

```
BaseOperation (abstract)
├── UIOperation (for user interactions)
│   └── UI Primitives (SelectOperation, InputTextOperation, etc.)
├── MenuOperation (for menu systems)
│   └── MainMenuOperation, BenchmarkOptionsMenuOperation
└── Business Operations
    └── BenchOperation, CompareOperation
```

### 3. Operation Chaining

Operations naturally chain together:
```typescript
MainMenuOperation → BenchmarkOptionsMenuOperation → BenchOperation
```

The `OperationRunner` executes chains, where each operation can return another operation to execute next.

## Key Implementation Details

### Operation Result Pattern

Every operation returns:
```typescript
interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### UI Primitives

Located in `src/operations/ui/primitives/`:
- **InputTextOperation**: Text input with validation
- **SelectOperation**: Choice from list
- **ConfirmOperation**: Yes/No/More Info
- **ShowInfoOperation**: Display information
- **InputPasswordOperation**: Masked password input
- **InputMultipleTextOperation**: Multi-field forms

### Simulated Input System

Operations support both interactive and automated modes:
```typescript
// Interactive mode
const op = new InputTextOperation("Enter name");
const result = await op.execute();

// Automated mode with simulated inputs
initUserInputQueue('input:"Alice"');
const result = await op.execute(); // Uses simulated input
```

### Operations as Standalone Programs

Every operation can run independently:
```bash
# Run an operation directly
deno run src/operations/ui/primitives/SelectOperation.ts

# Run with simulated inputs for testing
deno run src/operations/ui/primitives/SelectOperation.ts --inputs "select:2"
```

This is achieved with:
```typescript
if (import.meta.main) {
  const op = new MyOperation();
  const result = await op.execute();
  console.log('RESULT:', result);
}
```

## Testing Strategy

### Test Organization
- Tests live next to their operations: `Operation.ts` → `Operation.test.ts`
- Fixtures in `test/fixture/` directory
- Shared test helpers in `src/operations/ui/test-helpers.ts`

### Test Pattern
```typescript
Deno.test('Operation test', async () => {
  const output = await captureOutput(async () => {
    initUserInputQueue('input:"test"');
    const op = new MyOperation();
    const result = await op.execute();
    // Assert on result
  });

  const expected = await readFixture('MyOperation');
  assertEquals(normalizeOutput(output), normalizeOutput(expected));
});

// Prevent signal handler issues in tests
Deno.test.beforeAll(() => {
  SubLoggerManager.initialize({ suppressSignalHandlers: true });
});
```

### Generating Fixtures
```bash
deno run src/operations/ui/primitives/MyOperation.ts --inputs "input:'test'" > test/fixture/MyOperation.fixture.txt
```

## Creating New Operations

### 1. Basic Operation
```typescript
export class MyOperation extends BaseOperation<string> {
  constructor(private options: MyOptions) {
    super('My Operation');
  }

  protected async performOperation(): Promise<OperationResult<string>> {
    // Your logic here
    return { success: true, data: 'result' };
  }
}
```

### 2. UI Operation
```typescript
export class MyUIOperation extends UIOperation<string> {
  protected async performOperation(): Promise<OperationResult<string>> {
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

### 3. Menu Operation
```typescript
export class MyMenuOperation extends MenuOperation<Operation | null> {
  protected async performOperation(): Promise<OperationResult<Operation | null>> {
    const selectOp = new SelectOperation('Choose', ['Option 1', 'Option 2']);
    const result = await selectOp.execute();

    if (result.success && result.data === 'Option 1') {
      return { success: true, data: new SomeOperation() };
    }

    return { success: true, data: null };
  }
}
```

## Benefits of the Operations Pattern

1. **Composability**: Operations combine like LEGO blocks
2. **Testability**: Each operation is independently testable with fixtures
3. **Debuggability**: Run any operation standalone to debug
4. **Consistency**: Uniform interface for all actions
5. **Automation**: Built-in support for simulated inputs
6. **Type Safety**: Full TypeScript support throughout

## Common Patterns

### Validation with Retry
```typescript
if (validationError) {
  console.warn(validationError);
  return await this.performOperation(); // Recurse to retry
}
```

### Submenu Navigation
```typescript
// Main menu returns submenu operation
case 'Configure':
  return new ConfigurationMenuOperation();

// Submenu returns configured operation
case 'Start':
  return new ConfiguredOperation(this.config);
```

### Operation Chains
```typescript
// Operations return next operation in chain
const nextOp = new NextOperation(this.data);
return { success: true, data: nextOp };
```

## Tips for Future Development

1. **Keep operations focused**: One operation, one responsibility
2. **Use UI primitives**: Don't reinvent the wheel for common UI patterns
3. **Test with fixtures**: Generate and maintain fixture files for consistent testing
4. **Support both modes**: Always support interactive and simulated inputs
5. **Make operations runnable**: Add `if (import.meta.main)` blocks for debugging
6. **Chain thoughtfully**: Design operation chains that make sense to users

## Example: Adding a New Feature

To add a new feature (e.g., "analyze" command):

1. Create the business operation:
```typescript
// src/operations/AnalyzeOperation.ts
export class AnalyzeOperation extends BaseOperation<AnalysisResult> {
  // Implementation
}
```

2. Create configuration menu if needed:
```typescript
// src/operations/ui/menus/AnalyzeOptionsMenuOperation.ts
export class AnalyzeOptionsMenuOperation extends MenuOperation<AnalyzeOperation | null> {
  // Collect options, return configured AnalyzeOperation
}
```

3. Add to main menu:
```typescript
// src/operations/ui/MainMenuOperation.ts
case '🔍 Analyze':
  return new AnalyzeOptionsMenuOperation();
```

4. Create tests with fixtures:
```typescript
// src/operations/AnalyzeOperation.test.ts
Deno.test('AnalyzeOperation test', async () => {
  // Test implementation
});
```

5. Generate fixture:
```bash
deno run src/operations/AnalyzeOperation.ts --inputs "..." > test/fixture/AnalyzeOperation.fixture.txt
```

## Conclusion

The Operations Pattern provides a powerful, flexible foundation for building complex CLI applications. By treating everything as a composable operation, the codebase remains maintainable, testable, and extensible.