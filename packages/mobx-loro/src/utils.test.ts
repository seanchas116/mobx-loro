import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  LoroDoc,
  LoroMap,
  LoroList,
  LoroTree,
  LoroMovableList,
  LoroText,
} from "loro-crdt";
import { reaction } from "mobx";
import {
  getMap,
  getList,
  getTree,
  getMovableList,
  getText,
  disposePool,
} from "./utils";
import { ObservableLoroMap } from "./map";
import { ObservableLoroList } from "./list";

// Define test schemas for type safety
type TestSchema = {
  "test-map": LoroMap<Record<string, unknown>>;
  "my-map": LoroMap<Record<string, unknown>>;
  "my-list": LoroList<unknown>;
  "my-tree": LoroTree<Record<string, unknown>>;
  "my-movable": LoroMovableList<unknown>;
  "my-text": LoroText;
  "reactive-map": LoroMap<{ count: number }>;
  "list-with-maps": LoroList<LoroMap<{ name: string }>>;
  map: LoroMap<Record<string, unknown>>;
  map1: LoroMap<Record<string, unknown>>;
  map2: LoroMap<Record<string, unknown>>;
  list: LoroList<unknown>;
  test: LoroMap<Record<string, unknown>>;
  users: LoroMap<{ name: string; age: number }>;
  posts: LoroList<string>;
};

describe("Utility functions with WeakMap pool management", () => {
  let doc: LoroDoc<TestSchema>;

  beforeEach(() => {
    doc = new LoroDoc();
  });

  afterEach(() => {
    // Clean up the pool after each test
    disposePool(doc);
  });

  it("should automatically create and reuse pools", () => {
    const map1 = getMap(doc, "test-map");
    const map2 = getMap(doc, "test-map");

    // Should return the same instance (flyweight pattern)
    expect(map1).toBe(map2);

    // Should be an observable wrapper
    expect(map1).toBeInstanceOf(ObservableLoroMap);
  });

  it("should work with different container types", () => {
    const map = getMap(doc, "my-map");
    const list = getList(doc, "my-list");
    const tree = getTree(doc, "my-tree");
    const movableList = getMovableList(doc, "my-movable");
    const text = getText(doc, "my-text");

    expect(map).toBeInstanceOf(ObservableLoroMap);
    expect(list).toBeInstanceOf(ObservableLoroList);
    expect(tree).toBeDefined();
    expect(movableList).toBeDefined();
    expect(text).toBeDefined();
  });

  it("should maintain reactivity", () => {
    const map = getMap(doc, "reactive-map");

    let observedCount: number | undefined;
    const dispose = reaction(
      () => map.get("count"),
      (count) => {
        observedCount = count as number;
      },
    );

    map.set("count", 1);
    expect(observedCount).toBe(1);

    map.set("count", 2);
    expect(observedCount).toBe(2);

    dispose();
  });

  it("should handle nested containers", () => {
    const list = getList(doc, "list-with-maps");
    const nestedMap = list.pushContainer(new LoroMap());

    expect(nestedMap).toBeInstanceOf(ObservableLoroMap);

    nestedMap.set("name", "test");
    expect(nestedMap.get("name")).toBe("test");
  });

  it("should use different pools for different documents", () => {
    const doc2 = new LoroDoc<TestSchema>();

    const map1 = getMap(doc, "map");
    const map2 = getMap(doc2, "map");

    // Different documents should have different pools
    // We can verify this by checking that the pool property is different
    expect(map1.pool).toBeDefined();
    expect(map2.pool).toBeDefined();
    expect(map1.pool).not.toBe(map2.pool);

    // Clean up
    disposePool(doc2);
  });

  it("should maintain type inference with typed schema", () => {
    const users = getMap(doc, "users");

    // This should work with proper type inference
    users.set("name", "Bob");
    users.set("age", 25);

    const name: string = users.get("name") as string;
    const age: number = users.get("age") as number;

    expect(name).toBe("Bob");
    expect(age).toBe(25);
  });

  it("should handle disposePool correctly", () => {
    const map1 = getMap(doc, "test");
    const pool1 = map1.pool;

    disposePool(doc);

    // Getting a container after dispose should create a new pool
    const map2 = getMap(doc, "test");
    const pool2 = map2.pool;

    // Should have created a new pool after dispose
    expect(pool2).toBeDefined();
    expect(pool2).not.toBe(pool1);

    // Should still be an observable map
    expect(map2).toBeInstanceOf(ObservableLoroMap);
  });

  it("should work with typed schemas", () => {
    const users = getMap(doc, "users");
    const posts = getList(doc, "posts");

    users.set("name", "Alice");
    users.set("age", 30);
    posts.push("Hello World");

    expect(users.get("name")).toBe("Alice");
    expect(users.get("age")).toBe(30);
    expect(posts.get(0)).toBe("Hello World");
  });

  it("should handle concurrent operations from same document", () => {
    // Multiple calls should use the same pool
    const map1 = getMap(doc, "map1");
    const map2 = getMap(doc, "map2");
    const list = getList(doc, "list");

    // All should share the same pool
    expect(map1.pool).toBe(map2.pool);
    expect(map1.pool).toBe(list.pool);
  });

  describe("LoroDoc without schema", () => {
    let untypedDoc: LoroDoc;

    beforeEach(() => {
      untypedDoc = new LoroDoc();
    });

    afterEach(() => {
      disposePool(untypedDoc);
    });

    it("should work with getMap on untyped document", () => {
      const map = getMap(untypedDoc, "data");

      map.set("name", "test");
      map.set("count", 42);

      expect(map.get("name")).toBe("test");
      expect(map.get("count")).toBe(42);
    });

    it("should work with getList on untyped document", () => {
      const list = getList(untypedDoc, "items");

      list.push("first");
      list.push("second");

      expect(list.get(0)).toBe("first");
      expect(list.get(1)).toBe("second");
      expect(list.length).toBe(2);
    });

    it("should work with getTree on untyped document", () => {
      const tree = getTree(untypedDoc, "hierarchy");
      const root = tree.createNode();

      root.data.set("label", "root");
      expect(root.data.get("label")).toBe("root");
    });

    it("should work with getMovableList on untyped document", () => {
      const movable = getMovableList(untypedDoc, "ordered");

      movable.push(1);
      movable.push(2);
      movable.push(3);

      expect(movable.get(0)).toBe(1);
      expect(movable.length).toBe(3);
    });

    it("should work with getText on untyped document", () => {
      const text = getText(untypedDoc, "content");

      text.insert(0, "Hello ");
      text.insert(6, "World");

      expect(text.toString()).toBe("Hello World");
    });

    it("should maintain reactivity with untyped documents", () => {
      const map = getMap(untypedDoc, "reactive");

      let observedValue: number | undefined;
      const dispose = reaction(
        () => map.get("value"),
        (value) => {
          observedValue = value as number;
        },
      );

      map.set("value", 10);
      expect(observedValue).toBe(10);

      map.set("value", 20);
      expect(observedValue).toBe(20);

      dispose();
    });

    it("should handle nested containers in untyped documents", () => {
      const parent = getMap(untypedDoc, "parent");
      const childList = parent.setContainer("child", new LoroList());

      expect(childList).toBeInstanceOf(ObservableLoroList);

      childList.push("nested item");
      expect(childList.get(0)).toBe("nested item");
    });

    it("should use same pool for typed and untyped access", () => {
      // First access with type
      const typedMap = getMap(untypedDoc, "shared");
      typedMap.set("x", 100);

      // Second access without specific type
      const untypedMap = getMap(untypedDoc, "shared");

      // Should be the same instance
      expect(typedMap).toBe(untypedMap);
      expect(untypedMap.get("x")).toBe(100);
    });
  });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function typeTests() {
  const typedDoc = new LoroDoc<TestSchema>();

  // These should work - correct types
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const users = getMap(typedDoc, "users") satisfies ObservableLoroMap<{
    name: string;
    age: number;
  }>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const posts = getList(typedDoc, "posts") satisfies ObservableLoroList<string>;

  // These result in untyped containers
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const wrongMap = getMap(typedDoc, "posts");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const wrongList = getList(typedDoc, "users");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const wrongText = getText(typedDoc, "users");
}
