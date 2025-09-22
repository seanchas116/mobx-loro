# @seanchas116/mobx-loro

[![npm version](https://badge.fury.io/js/@seanchas116%2Fmobx-loro.svg)](https://badge.fury.io/js/@seanchas116%2Fmobx-loro)
[![Tests](https://github.com/seanchas116/mobx-loro/actions/workflows/node.js.yml/badge.svg)](https://github.com/seanchas116/mobx-loro/actions/workflows/node.js.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[MobX](https://mobx.js.org/) wrappers for [Loro CRDT](https://loro.dev/) containers, enabling automatic UI updates when CRDT data changes.

## Installation

```bash
npm install @seanchas116/mobx-loro loro-crdt mobx
```

## Quick Start

```typescript
import { LoroDoc } from "loro-crdt";
import { getMap, getList } from "@seanchas116/mobx-loro";
import { reaction } from "mobx";

const doc = new LoroDoc();

// Get observable wrappers
const map = getMap(doc, "myMap");
const list = getList(doc, "myList");

// Automatically react to changes
reaction(
  () => map.toJSON(),
  (json) => console.log("Map changed:", json),
);
```

## React Integration

```tsx
import React from "react";
import { observer } from "mobx-react-lite";
import { LoroDoc, LoroMap } from "loro-crdt";
import { getList } from "@seanchas116/mobx-loro";

type TodoData = {
  title: string;
  completed: boolean;
};

const TodoList = observer(({ doc }: { doc: LoroDoc }) => {
  const todos = getList(doc, "todos");

  return (
    <div>
      <h2>Todos ({todos.length})</h2>
      {todos.toArray().map((todo: any, i: number) => (
        <div key={i}>
          <input
            type="checkbox"
            checked={todo.get("completed")}
            onChange={() => todo.set("completed", !todo.get("completed"))}
          />
          {todo.get("title")}
        </div>
      ))}
      <button
        onClick={() => {
          const todo = todos.pushContainer(new LoroMap<TodoData>());
          todo.set("title", "New Todo");
          todo.set("completed", false);
        }}
      >
        Add Todo
      </button>
    </div>
  );
});
```

## Key Features

- **Automatic Reactivity**: Seamless MobX integration for CRDT containers
- **Type Safety**: Full TypeScript support with automatic type transformations
- **Flyweight Pattern**: Single instance per container
- **All Loro Containers**: Map, List, Tree, MovableList, and Text support
- **Nested Containers**: Automatic wrapping with proper typing

## Type Safety

The library provides automatic type inference from your schema:

```typescript
import { LoroDoc, LoroMap, LoroList } from "loro-crdt";
import { getList, getMap } from "@seanchas116/mobx-loro";

// Define your document schema
type Schema = {
  metadata: LoroMap<{ lastModified: number }>;
  todos: LoroList<LoroMap<{ title: string; done: boolean }>>;
};

const doc = new LoroDoc<Schema>();

// Types are automatically inferred from the schema
const metadata = getMap(doc, "metadata");
// Type: ObservableLoroMap<{ lastModified: number }>

const todos = getList(doc, "todos");
// Type: ObservableLoroList<LoroMap<{ title: string; done: boolean }>>

// Nested containers are also properly typed
const firstTodo = todos.get(0);
// Type: ObservableLoroMap<{ title: string; done: boolean }>
```

## Collaborative Todo Store

```typescript
import { makeAutoObservable } from "mobx";
import { LoroDoc, LoroMap } from "loro-crdt";
import { getList } from "@seanchas116/mobx-loro";

class TodoStore {
  doc = new LoroDoc();

  constructor() {
    makeAutoObservable(this);
  }

  get todos() {
    return getList(this.doc, "todos");
  }

  addTodo(title: string) {
    const todo = this.todos.pushContainer(new LoroMap());
    todo.set("id", crypto.randomUUID());
    todo.set("title", title);
    todo.set("completed", false);
  }

  // Sync with other peers
  applyUpdate(update: Uint8Array) {
    this.doc.import(update);
  }

  getUpdate(): Uint8Array {
    return this.doc.exportFrom();
  }
}
```

## License

MIT © [Ryohei Ikegami](https://github.com/seanchas116)
