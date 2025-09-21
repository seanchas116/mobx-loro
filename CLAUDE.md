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
pnpm vitest run src/map.test.ts  # Run specific test file
pnpm vitest watch src/map.test.ts # Watch mode for specific test
```

## Architecture

### Core Design Pattern: Flyweight with Pool

The library uses a **flyweight pattern** via `ObservableLoroPool` to ensure:

- Single JavaScript object instance per Loro container (identity stability)
- Memory efficiency by avoiding duplicate wrappers
- Stable references for React re-render optimization

**Critical Rule**: All observable wrappers MUST be created through `ObservableLoroPool`. Direct instantiation is blocked via TypeScript's branded types using `OBSERVABLE_LORO_INTERNAL_CREATE` symbol.

### Public API

The library exports:

1. **Observable Wrapper Classes** (for type annotations):
   - `ObservableLoroMap`, `ObservableLoroList`, `ObservableLoroTree`
   - `ObservableMovableList`, `ObservableLoroText`, `ObservableLoroTreeNode`

2. **Type Transformation Utilities**:
   - `ToObservable<T>`: Transforms Loro container types to observable equivalents
   - `ToObservableArray<T>`: Maps array element types through ToObservable
   - `ToObservableRecord<T>`: Maps record value types through ToObservable

3. **Utility Functions** (primary API):
   - `getMap(doc, key)`, `getList(doc, key)`, `getTree(doc, key)`
   - `getMovableList(doc, key)`, `getText(doc, key)`
   - `toObservable(container)`: Wrap any container
   - `disposePool(doc)`: Clean up resources

Note: `ObservableLoroPool` is intentionally not exported. Use utility functions for automatic pool management.

### Observable Wrapper Classes

Each Loro container type has a corresponding observable wrapper:

1. **ObservableLoroMap**: Map-like API with MobX reactivity
2. **ObservableLoroList**: Array-like API with index-based operations
3. **ObservableLoroTree**: Hierarchical data with node management
4. **ObservableMovableList**: List with move operations for reordering
5. **ObservableLoroText**: Collaborative text editing operations

### Key Implementation Details

1. **Two-way Binding**: Each wrapper:
   - Listens to Loro events via `subscribe()`
   - Updates MobX atoms via `reportChanged()`
   - Proxies operations to underlying Loro container

2. **Nested Container Access**: When accessing nested containers (e.g., `map.get("nested")` returns another container), the wrapper automatically returns the appropriate observable wrapper from the pool using `pool.get()`.

3. **TreeNode Special Handling**: `ObservableLoroTreeNode` wraps individual tree nodes and maintains stable instances through the pool's node cache.

4. **Type Transformations**: The type metafunctions (`ToObservable`, `ToObservableArray`, `ToObservableRecord`) automatically transform Loro container types in schemas to their observable counterparts, supporting nested structures.

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

## Release Process

To release a new version of the package:

1. **Update version** in `packages/mobx-loro/package.json`

   ```bash
   cd packages/mobx-loro
   # Edit package.json to bump version
   ```

2. **Commit version bump**

   ```bash
   git add -A
   git commit -m "Release vX.Y.Z

   - Add changelog notes here"
   ```

3. **Build and test**

   ```bash
   pnpm build
   pnpm test
   ```

4. **Publish to npm**

   ```bash
   npm publish --access public
   ```

   Note: The `prepublishOnly` script automatically copies the root README.md to the package directory.

5. **Create and push git tag**
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z - Description"
   git push origin main
   git push origin vX.Y.Z
   ```

### Version History

- **v0.0.2** - Include README.md in npm package
- **v0.0.1** - Initial release with MobX-Loro reactive wrappers
