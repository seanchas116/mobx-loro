import { describe, it, expect, vi } from "vitest";
import { reaction } from "mobx";
import { LoroMap, LoroList } from "loro-crdt";
import { createTestPool } from "./test-helpers";

describe("ObservableLoroList", () => {
  it("should track list access with MobX", () => {
    const { pool, doc } = createTestPool();
    const loroList = doc.getList("test");
    const observableList = pool.get(loroList);

    // Add initial items
    observableList.push("item1");
    observableList.push("item2");

    // Track list changes with MobX
    const snapshots: unknown[] = [];
    const disposer = reaction(
      () => observableList.toArray(),
      (array) => snapshots.push([...array]),
    );

    // Should not trigger initially
    expect(snapshots).toHaveLength(0);

    // Modify list
    observableList.push("item3");
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toEqual(["item1", "item2", "item3"]);

    // Insert at position
    observableList.insert(1, "inserted");
    expect(snapshots).toHaveLength(2);
    expect(snapshots[1]).toEqual(["item1", "inserted", "item2", "item3"]);

    // Delete items
    observableList.delete(0, 2);
    expect(snapshots).toHaveLength(3);
    expect(snapshots[2]).toEqual(["item2", "item3"]);

    disposer();
  });

  it("should track length changes", () => {
    const { pool, doc } = createTestPool();
    const loroList = doc.getList("test");
    const observableList = pool.get(loroList);

    observableList.push("a");
    observableList.push("b");

    const lengths: number[] = [];
    const disposer = reaction(
      () => observableList.length,
      (length) => lengths.push(length),
    );

    expect(lengths).toHaveLength(0);

    observableList.push("c");
    expect(lengths).toEqual([3]);

    observableList.delete(0, 1);
    expect(lengths).toEqual([3, 2]);

    observableList.insert(0, "new");
    expect(lengths).toEqual([3, 2, 3]);

    disposer();
  });

  it("should handle basic operations", () => {
    const { pool, doc } = createTestPool();
    const loroList = doc.getList("test");
    const observableList = pool.get(loroList);

    // Push and get
    observableList.push("first");
    observableList.push("second");
    expect(observableList.get(0)).toBe("first");
    expect(observableList.get(1)).toBe("second");

    // Length
    expect(observableList.length).toBe(2);

    // Insert
    observableList.insert(1, "middle");
    expect(observableList.toArray()).toEqual(["first", "middle", "second"]);

    // Delete single item
    observableList.delete(1, 1);
    expect(observableList.toArray()).toEqual(["first", "second"]);

    // Delete multiple items
    observableList.push("third");
    observableList.push("fourth");
    observableList.delete(1, 2);
    expect(observableList.toArray()).toEqual(["first", "fourth"]);
  });

  it("should handle remote changes", async () => {
    const { doc: doc1, pool: pool1 } = createTestPool();
    const { doc: doc2, pool: pool2 } = createTestPool();

    const loroList1 = doc1.getList("test");
    const loroList2 = doc2.getList("test");
    const observableList1 = pool1.get(loroList1);
    const observableList2 = pool2.get(loroList2);

    const handler = vi.fn();
    const disposer = reaction(() => observableList2.toArray(), handler);

    // Make change in doc1
    observableList1.push("remote-item");

    // Sync to doc2
    const updates = doc1.exportFrom(doc2.version());
    doc2.import(updates);

    // Should trigger reaction
    await vi.waitFor(() => expect(handler).toHaveBeenCalled());
    expect(observableList2.toArray()).toEqual(["remote-item"]);

    disposer();
  });

  it("should handle container insertion", () => {
    const { pool, doc } = createTestPool();
    const loroList = doc.getList("test");
    const observableList = pool.get(loroList);

    // Insert container at position - use actual LoroMap instance
    observableList.insertContainer(0, new LoroMap());
    expect(observableList.length).toBe(1);

    // Push container
    observableList.pushContainer(new LoroList());
    expect(observableList.length).toBe(2);

    // Containers should be accessible
    const item1 = observableList.get(0);
    const item2 = observableList.get(1);
    expect(item1).toBeDefined();
    expect(item2).toBeDefined();
  });

  it("should handle mixed types", () => {
    const { pool, doc } = createTestPool();
    const loroList = doc.getList("test");
    const observableList = pool.get(loroList);

    observableList.push("string");
    observableList.push(42);
    observableList.push(true);

    expect(observableList.toArray()).toEqual(["string", 42, true]);
    expect(observableList.get(0)).toBe("string");
    expect(observableList.get(1)).toBe(42);
    expect(observableList.get(2)).toBe(true);
  });

  it("should track individual item access", () => {
    const { pool, doc } = createTestPool();
    const loroList = doc.getList("test");
    const observableList = pool.get(loroList);

    observableList.push("a");
    observableList.push("b");
    observableList.push("c");

    const accessedItems: unknown[] = [];
    const disposer = reaction(
      () => observableList.get(1),
      (item) => accessedItems.push(item),
    );

    // Changing the accessed item should trigger
    observableList.delete(0, 1); // Now "c" is at index 1
    expect(accessedItems).toEqual(["c"]);

    // Inserting before should shift items
    observableList.insert(0, "new");
    expect(accessedItems).toEqual(["c", "b"]); // "b" is back at index 1

    disposer();
  });

  it("should support subscribing to changes", () => {
    const { pool, doc } = createTestPool();
    const loroList = doc.getList("test");
    const observableList = pool.get(loroList);

    // Just verify that subscribe returns an unsubscribe function
    const unsubscribe = observableList.subscribe(() => {});
    expect(typeof unsubscribe).toBe("function");

    // Should not throw when unsubscribing
    expect(() => unsubscribe()).not.toThrow();
  });

  it("should return cursor position", () => {
    const { pool, doc } = createTestPool();
    const loroList = doc.getList("test");
    const observableList = pool.get(loroList);

    observableList.push("a");
    observableList.push("b");

    const cursor = observableList.getCursor(1);
    expect(cursor).toBeDefined();
  });

  it("should handle empty list operations", () => {
    const { pool, doc } = createTestPool();
    const loroList = doc.getList("test");
    const observableList = pool.get(loroList);

    expect(observableList.length).toBe(0);
    expect(observableList.toArray()).toEqual([]);

    // Delete on empty list with valid parameters
    expect(() => observableList.delete(0, 0)).not.toThrow();
  });

  it("should provide access to underlying LoroList", () => {
    const { pool, doc } = createTestPool();
    const loroList = doc.getList("test");
    const observableList = pool.get(loroList);

    const underlyingList = observableList.original;
    expect(underlyingList).toBeDefined();
    // In browser environment, constructor name might be minified
    expect(underlyingList.constructor.name).toMatch(/^_?LoroList$/);
  });

  it("should handle getAttached method", () => {
    const { pool, doc } = createTestPool();
    const loroList = doc.getList("test");
    const observableList = pool.get(loroList);

    const attached = observableList.getAttached();
    expect(attached).toBeDefined();
  });
});
