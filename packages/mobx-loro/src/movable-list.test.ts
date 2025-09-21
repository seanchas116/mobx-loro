import { describe, it, expect, vi } from "vitest";
import { reaction } from "mobx";
import { createTestPool } from "./test-helpers";

describe("ObservableMovableList", () => {
  it("should track array access with MobX", () => {
    const { pool, doc } = createTestPool();
    const loroMovableList = doc.getMovableList("test");
    const observableList = pool.get(loroMovableList);

    // Add initial items
    observableList.push("item1");
    observableList.push("item2");
    observableList.push("item3");

    // Track array changes with MobX
    const values: string[][] = [];
    const disposer = reaction(
      () => observableList.toArray(),
      (arr) => values.push([...arr] as string[]),
    );

    // Should not trigger initially
    expect(values).toHaveLength(0);

    // Modify array
    observableList.push("item4");
    expect(values).toHaveLength(1);
    expect(values[0]).toEqual(["item1", "item2", "item3", "item4"]);

    observableList.set(1, "modified");
    expect(values).toHaveLength(2);
    expect(values[1]).toEqual(["item1", "modified", "item3", "item4"]);

    observableList.delete(0, 1);
    expect(values).toHaveLength(3);
    expect(values[2]).toEqual(["modified", "item3", "item4"]);

    disposer();
  });

  it("should support basic array operations", () => {
    const { pool, doc } = createTestPool();
    const loroMovableList = doc.getMovableList("test");
    const observableList = pool.get(loroMovableList);

    // Push
    observableList.push(1);
    observableList.push(2);
    observableList.push(3);
    expect(observableList.toArray()).toEqual([1, 2, 3]);
    expect(observableList.length).toBe(3);

    // Get
    expect(observableList.get(0)).toBe(1);
    expect(observableList.get(3)).toBeUndefined();

    // Set
    observableList.set(1, 10);
    expect(observableList.toArray()).toEqual([1, 10, 3]);

    // Insert
    observableList.insert(1, 5);
    observableList.insert(2, 6);
    expect(observableList.toArray()).toEqual([1, 5, 6, 10, 3]);

    // Delete
    observableList.delete(2, 2);
    expect(observableList.toArray()).toEqual([1, 5, 3]);

    // Clear all
    observableList.delete(0, observableList.length);
    expect(observableList.toArray()).toEqual([]);
    expect(observableList.length).toBe(0);
  });

  it("should support basic read operations", () => {
    const { pool, doc } = createTestPool();
    const loroMovableList = doc.getMovableList("test");
    const observableList = pool.get(loroMovableList);

    observableList.push("apple");
    observableList.push("banana");
    observableList.push("cherry");
    observableList.push("date");

    // Test toArray
    const array = observableList.toArray();
    expect(array).toEqual(["apple", "banana", "cherry", "date"]);

    // Test get
    expect(observableList.get(1)).toBe("banana");
    expect(observableList.get(4)).toBeUndefined();
  });

  it("should support move operations", () => {
    const { pool, doc } = createTestPool();
    const loroMovableList = doc.getMovableList("test");
    const observableList = pool.get(loroMovableList);

    observableList.push("a");
    observableList.push("b");
    observableList.push("c");
    observableList.push("d");

    // Move item from index 0 to index 2
    observableList.move(0, 2);
    expect(observableList.toArray()).toEqual(["b", "c", "a", "d"]);

    // Move item from index 3 to index 1
    observableList.move(3, 1);
    expect(observableList.toArray()).toEqual(["b", "d", "c", "a"]);
  });

  it("should support toArray", () => {
    const { pool, doc } = createTestPool();
    const loroMovableList = doc.getMovableList("test");
    const observableList = pool.get(loroMovableList);

    observableList.push(1);
    observableList.push(2);
    observableList.push(3);

    // Test toArray instead
    expect(observableList.toArray()).toEqual([1, 2, 3]);
  });

  it("should support array processing with toArray", () => {
    const { pool, doc } = createTestPool();
    const loroMovableList = doc.getMovableList("test");
    const observableList = pool.get(loroMovableList);

    observableList.push("a");
    observableList.push("b");
    observableList.push("c");

    // Test using toArray and native forEach
    const results: Array<{ item: string; index: number }> = [];
    observableList.toArray().forEach((item, index) => {
      results.push({ item: item as string, index });
    });

    expect(results).toEqual([
      { item: "a", index: 0 },
      { item: "b", index: 1 },
      { item: "c", index: 2 },
    ]);
  });

  it("should handle subscribe/unsubscribe for remote changes", async () => {
    const { doc: doc1, pool: pool1 } = createTestPool();
    const { doc: doc2, pool: pool2 } = createTestPool();

    const loroMovableList1 = doc1.getMovableList<string>("test");
    const loroMovableList2 = doc2.getMovableList<string>("test");
    const observableList1 = pool1.get(loroMovableList1);
    const observableList2 = pool2.get(loroMovableList2);

    const handler = vi.fn();
    const unsubscribe = observableList2.subscribe(handler);

    // Make a change in doc1
    observableList1.push("test");

    // Sync the change to doc2
    const update = doc1.export({ mode: "update" });
    doc2.import(update);

    // The handler should be called for the remote change
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(handler).toHaveBeenCalledTimes(1);

    unsubscribe();

    // Make another change and sync
    observableList1.push("test2");
    const update2 = doc1.export({ mode: "update" });
    doc2.import(update2);

    // Handler should not be called after unsubscribe
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should clean up observers when not being observed", () => {
    const { pool, doc } = createTestPool();
    const loroMovableList = doc.getMovableList("test");
    const observableList = pool.get(loroMovableList);

    observableList.push("item1");
    observableList.push("item2");

    let observedValues: string[] = [];
    const disposer = reaction(
      () => observableList.toArray(),
      (values) => {
        observedValues = [...values] as string[];
      },
    );

    // Trigger a change
    observableList.push("item3");
    expect(observedValues).toEqual(["item1", "item2", "item3"]);

    // Dispose the reaction
    disposer();

    // Further changes should not be observed
    observableList.push("item4");
    expect(observedValues).toEqual(["item1", "item2", "item3"]); // Should not change
  });
});
