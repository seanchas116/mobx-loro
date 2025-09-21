import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LoroDoc, LoroMap } from "loro-crdt";
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

describe("Utility functions with WeakMap pool management", () => {
  let doc: LoroDoc;

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
    const map = getMap<{ count: number }>(doc, "reactive-map");

    let observedCount: number | undefined;
    const dispose = reaction(
      () => map.get("count"),
      (count) => {
        observedCount = count;
      },
    );

    map.set("count", 1);
    expect(observedCount).toBe(1);

    map.set("count", 2);
    expect(observedCount).toBe(2);

    dispose();
  });

  it("should handle nested containers", () => {
    const list = getList<LoroMap<{ name: string }>>(doc, "list-with-maps");
    const nestedMap = list.pushContainer(new LoroMap());

    expect(nestedMap).toBeInstanceOf(ObservableLoroMap);

    nestedMap.set("name", "test");
    expect(nestedMap.get("name")).toBe("test");
  });

  it("should use different pools for different documents", () => {
    const doc2 = new LoroDoc();

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
    const users = getMap<{ name: string; age: number }>(doc, "users");
    const posts = getList<string>(doc, "posts");

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
});
