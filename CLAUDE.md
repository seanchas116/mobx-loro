# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo for @seanchas116/mobx-loro, which provides MobX-compatible reactive wrappers for Loro CRDT containers. The library enables automatic UI updates when CRDT data changes by seamlessly integrating Loro's collaboration features with MobX's reactivity system.

## Development Commands

### Root Level (monorepo)

```bash
pnpm install          # Install dependencies for all packages
pnpm build           # Build all packages via Turborepo
pnpm test            # Run all tests via Turborepo
pnpm lint            # Lint all packages
pnpm format          # Format all files with Prettier
pnpm check           # Run all checks: verify-readme, format:check, lint, test
pnpm verify-readme   # Type-check README code snippets
```

### Package Level (packages/mobx-loro)

```bash
cd packages/mobx-loro
pnpm dev             # Watch mode for development with tsup
pnpm build           # Build the package with tsup
pnpm test            # Run tests with Vitest
pnpm lint            # Run ESLint on src directory
```

### Running Single Tests

```bash
cd packages/mobx-loro
pnpm vitest run src/observable-loro-map.test.ts  # Run specific test file
pnpm vitest watch src/observable-loro-map.test.ts # Watch mode for specific test
```

## Architecture

### Core Design Pattern: Flyweight with Pool

The library uses a **flyweight pattern** via `ObservableLoroPool` to ensure:

- Single JavaScript object instance per Loro container (identity stability)
- Memory efficiency by avoiding duplicate wrappers
- Stable references for React re-render optimization

**Critical Rule**: All observable wrappers MUST be created through `ObservableLoroPool`. Direct instantiation is blocked via TypeScript's branded types using `OBSERVABLE_LORO_INTERNAL_CREATE` symbol.

### Observable Wrapper Classes

Each Loro container type has a corresponding observable wrapper:

1. **ObservableLoroDoc**: Wraps LoroDoc, provides transaction support
2. **ObservableLoroMap**: Map-like API with MobX reactivity
3. **ObservableLoroList**: Array-like API with index-based operations
4. **ObservableLoroTree**: Hierarchical data with node management
5. **ObservableMovableList**: List with move operations for reordering
6. **ObservableLoroText**: Collaborative text editing operations

### Key Implementation Details

1. **Two-way Binding**: Each wrapper:
   - Listens to Loro events via `subscribe()`
   - Updates MobX atoms via `reportChanged()`
   - Proxies operations to underlying Loro container

2. **Nested Container Access**: When accessing nested containers (e.g., `map.get("nested")` returns another container), the wrapper automatically returns the appropriate observable wrapper from the pool.

3. **TreeNode Special Handling**: `ObservableLoroTreeNode` wraps individual tree nodes and maintains stable instances through the pool's node cache.

4. **Transaction Support**: `ObservableLoroDoc.withTransaction()` ensures atomic updates across multiple operations.

## Testing Strategy

- Tests use `createTestDoc()` helper from `test-helpers.ts`
- Each wrapper class has comprehensive test coverage
- Tests verify both MobX reactivity and Loro CRDT semantics
- Use `autorun` and `reaction` to test reactive updates

## Build Configuration

- **tsup**: Builds both CommonJS and ESM formats with TypeScript declarations
- **Vitest**: Test runner with TypeScript support
- **ESLint**: Configured with TypeScript rules
- **Turborepo**: Orchestrates monorepo builds and caching

## README Code Verification

The README contains TypeScript code examples that are verified during CI:

```bash
pnpm verify-readme  # Uses typescript-docs-verifier
```

Note: `@types/node` is required for console.log in examples.
