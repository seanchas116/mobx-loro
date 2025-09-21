import { describe, it, expect, vi } from "vitest";
import { reaction } from "mobx";
import { LoroList, LoroMap, LoroText } from "loro-crdt";
import { createTestPool } from "./test-helpers";
import { ObservableLoroText } from "./text";
import { ObservableLoroList } from "./list";
import { ObservableLoroMap } from "./map";

describe("ObservableLoroMap", () => {
  it("should track map access with MobX", () => {
    const { pool, doc } = createTestPool();
    const loroMap = doc.getMap("test");
    const observableMap = pool.get(loroMap);

    // Add initial items
    observableMap.set("key1", "value1");
    observableMap.set("key2", "value2");

    // Track map changes with MobX
    const snapshots: unknown[] = [];
    const disposer = reaction(
      () => observableMap.toJSON(),
      (json) => snapshots.push(json as unknown),
    );

    // Should not trigger initially
    expect(snapshots).toHaveLength(0);

    // Modify map
    observableMap.set("key3", "value3");
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toEqual({
      key1: "value1",
      key2: "value2",
      key3: "value3",
    });

    // Delete key
    observableMap.delete("key1");
    expect(snapshots).toHaveLength(2);
    expect(snapshots[1]).toEqual({
      key2: "value2",
      key3: "value3",
    });

    // Clear
    observableMap.clear();
    expect(snapshots).toHaveLength(3);
    expect(snapshots[2]).toEqual({});

    disposer();
  });

  it("should track size changes", () => {
    const { pool, doc } = createTestPool();
    const loroMap = doc.getMap("test");
    const observableMap = pool.get(loroMap);

    observableMap.set("a", 1);
    observableMap.set("b", 2);

    const sizes: number[] = [];
    const disposer = reaction(
      () => observableMap.size,
      (size) => sizes.push(size),
    );

    expect(sizes).toHaveLength(0);

    observableMap.set("c", 3);
    expect(sizes).toEqual([3]);

    observableMap.delete("a");
    expect(sizes).toEqual([3, 2]);

    observableMap.clear();
    expect(sizes).toEqual([3, 2, 0]);

    disposer();
  });

  it("should handle basic operations", () => {
    const { pool, doc } = createTestPool();
    const loroMap = doc.getMap("test");
    const observableMap = pool.get(loroMap);

    // Set and get
    observableMap.set("foo", "bar");
    expect(observableMap.get("foo")).toBe("bar");

    // Size
    expect(observableMap.size).toBe(1);

    // Keys
    observableMap.set("baz", "qux");
    const keys = observableMap.keys();
    expect(keys).toHaveLength(2);
    expect(keys).toContain("foo");
    expect(keys).toContain("baz");

    // Values
    const values = observableMap.values();
    expect(values).toHaveLength(2);
    expect(values).toContain("bar");
    expect(values).toContain("qux");

    // Entries
    const entries = observableMap.entries();
    expect(entries).toHaveLength(2);
    const entriesMap = new Map(entries);
    expect(entriesMap.get("foo")).toBe("bar");
    expect(entriesMap.get("baz")).toBe("qux");

    // Delete
    observableMap.delete("foo");
    expect(observableMap.get("foo")).toBeUndefined();
    expect(observableMap.size).toBe(1);

    // Clear
    observableMap.clear();
    expect(observableMap.size).toBe(0);
  });

  it("should handle remote changes", async () => {
    const { doc: doc1, pool: pool1 } = createTestPool();
    const { doc: doc2, pool: pool2 } = createTestPool();

    const loroMap1 = doc1.getMap("test");
    const loroMap2 = doc2.getMap("test");
    const observableMap1 = pool1.get(loroMap1);
    const observableMap2 = pool2.get(loroMap2);

    const handler = vi.fn();
    const disposer = reaction(() => observableMap2.toJSON(), handler);

    // Make change in doc1
    observableMap1.set("remote", "value");

    // Sync to doc2
    const updates = doc1.exportFrom(doc2.version());
    doc2.import(updates);

    // Should trigger reaction
    await vi.waitFor(() => expect(handler).toHaveBeenCalled());
    expect(observableMap2.get("remote")).toBe("value");

    disposer();
  });

  it("should handle setContainer", () => {
    const { pool, doc } = createTestPool();
    const loroMap = doc.getMap("test");
    const observableMap = pool.get(loroMap);

    // Set a text container
    const text = observableMap.setContainer("text", new LoroText());
    expect(text).toBeDefined();
    expect(text.toString()).toBe("");
    text.insert(0, "Hello");
    expect(text.toString()).toBe("Hello");

    // Set a list container
    const list = observableMap.setContainer("list", new LoroList());
    expect(list).toBeDefined();
    expect(list.length).toBe(0);
    list.push("item1");
    expect(list.get(0)).toBe("item1");

    // Set a map container
    const nestedMap = observableMap.setContainer("map", new LoroMap());
    expect(nestedMap).toBeDefined();
    expect(nestedMap.size).toBe(0);
    nestedMap.set("nested", "value");
    expect(nestedMap.get("nested")).toBe("value");

    // Check that containers are accessible via get
    const retrievedText = observableMap.get("text") as ObservableLoroText;
    expect(retrievedText).toBe(text);
    expect(retrievedText.toString()).toBe("Hello");

    const retrievedList = observableMap.get("list") as ObservableLoroList;
    expect(retrievedList).toBe(list);
    expect(retrievedList.get(0)).toBe("item1");

    const retrievedMap = observableMap.get("map") as ObservableLoroMap;
    expect(retrievedMap).toBe(nestedMap);
    expect(retrievedMap.get("nested")).toBe("value");
  });

  it("should handle getOrCreateContainer", () => {
    const { pool, doc } = createTestPool();
    const loroMap = doc.getMap("test");
    const observableMap = pool.get(loroMap);

    // First call creates the container
    const text1 = observableMap.getOrCreateContainer("text", new LoroText());
    expect(text1).toBeDefined();
    text1.insert(0, "Hello");
    expect(text1.toString()).toBe("Hello");

    // Second call returns the same container
    const text2 = observableMap.getOrCreateContainer("text", new LoroText());
    expect(text2).toBe(text1);
    expect(text2.toString()).toBe("Hello");

    // Create different container types
    const list = observableMap.getOrCreateContainer("list", new LoroList());
    list.push("item");

    // Should return existing list even if we try to create text
    const existingList = observableMap.getOrCreateContainer(
      "list",
      new LoroList(),
    );
    expect(existingList).toBe(list);
    expect(existingList.get(0)).toBe("item");

    // Should work with nested maps
    const nestedMap = observableMap.getOrCreateContainer("map", new LoroMap());
    nestedMap.set("key", "value");

    const existingMap = observableMap.getOrCreateContainer(
      "map",
      new LoroMap(),
    );
    expect(existingMap).toBe(nestedMap);
    expect(existingMap.get("key")).toBe("value");
  });

  it("should trigger reactions when using setContainer and getOrCreateContainer", () => {
    const { pool, doc } = createTestPool();
    const loroMap = doc.getMap("test");
    const observableMap = pool.get(loroMap);

    const snapshots: unknown[] = [];
    const disposer = reaction(
      () => observableMap.size,
      (size) => snapshots.push(size),
    );

    // setContainer should trigger reaction
    observableMap.setContainer("text", new LoroText());
    expect(snapshots).toEqual([1]);

    observableMap.setContainer("list", new LoroList());
    expect(snapshots).toEqual([1, 2]);

    // getOrCreateContainer should trigger reaction on creation
    observableMap.getOrCreateContainer("map", new LoroMap());
    expect(snapshots).toEqual([1, 2, 3]);

    // But not when getting existing
    observableMap.getOrCreateContainer("map", new LoroMap());
    expect(snapshots).toEqual([1, 2, 3]);

    disposer();
  });
});
