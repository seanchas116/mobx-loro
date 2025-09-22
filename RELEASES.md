# Release Notes

## v0.0.4 (2025-09-22)

### Improvements

- Fixed utility functions to work with both typed and untyped `LoroDoc`
- Added support for `ContainerID` as key type in utility functions
- Graceful fallback to untyped containers when keys don't match schema
- Added comprehensive tests for untyped document usage

### Developer Experience

- No breaking changes - maintains full backward compatibility
- Improved experience when working with untyped documents
- Better type inference with fallback behavior

## v0.0.3 (2025-09-21)

### Features

- Added automatic type inference for utility functions from `LoroDoc` schemas
- Utility functions (`getMap`, `getList`, etc.) now infer types from document schema
- No need for manual type annotations when using typed documents

### Developer Experience

- Improved TypeScript support with automatic type inference
- Reduced boilerplate when working with typed schemas

## v0.0.2 (2025-09-21)

### Improvements

- Include README.md in npm package for better documentation on npmjs.com
- Added `prepublishOnly` script to automatically copy root README to package

### Documentation

- README now visible on npm package page

## v0.0.1 (2025-09-21)

### Initial Release

- MobX-compatible reactive wrappers for Loro CRDT containers
- Support for all Loro container types:
  - `ObservableLoroMap` - Map-like API with MobX reactivity
  - `ObservableLoroList` - Array-like API with MobX reactivity
  - `ObservableLoroTree` - Hierarchical data with reactive nodes
  - `ObservableMovableList` - List with move operations
  - `ObservableLoroText` - Collaborative text editing
- Flyweight pattern implementation for single instance per container
- Automatic nested container wrapping
- Full TypeScript support with type transformations
- Utility functions for easy API usage with automatic pool management
- React integration support with mobx-react-lite
